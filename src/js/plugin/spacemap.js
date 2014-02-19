/*jslint browser: true, nomen: true */

(function (tangelo, $, d3, google) {
    "use strict";

    if (!($ && $.widget && d3)) {
        $.fn.nodelink = tangelo.unavailable({
            plugin: "nodelink",
            required: ["JQuery", "JQuery UI", "d3"]
        });
        return;
    }

    tangelo.widget("tangelo.spacemap", {
        options: {
            data: [],
            constraints: [],
            linkDistance: 20,
            charge: -30,
            gravity: 0.1,
            label: tangelo.accessor({value: ""}),
            width: $(window).width(),
            height: $(window).height()
        },

        _create: function () {
            var options,
                mapConfig,
                mapOptions,
                that = this;

            this.force = d3.layout.force();

            mapConfig = {
                initialize: function (svg) {
                    that.svg = d3.select(svg);
                    that._update();
                },

                draw: function (d) {
                    this.shift(that.svg.node(), -d.translation.x, -d.translation.y);
                    that.nodes.forEach(function(node) {
                        var loc, googleLoc, pixelLoc;
                        if (node.constraint && node.constraint.type === "map") {
                            loc = node.constraint.accessor(node.data);
                            googleLoc = new google.maps.LatLng(loc.lat, loc.lng);
                            pixelLoc = d.projection.fromLatLngToContainerPixel(googleLoc);
                            node.mapX = pixelLoc.x;
                            node.mapY = pixelLoc.y;
                        }
                    });
                    that.force.start();
                    that._tick();
                }
            };

            // Some options for initializing the google map.
            mapOptions = {
                zoom: 2,
                center: new google.maps.LatLng(15, 0),
                mapTypeId: google.maps.MapTypeId.ROADMAP
            };
            // this.map = new tangelo.GoogleMapSVG(this.element.get(0), mapOptions, mapConfig);
            // this.map.on(["draw", "drag", "zoom_changed"], mapConfig.draw);
            this.svg = d3.select(this.element.get(0)).append("svg");

            options = $.extend(true, {}, this.options);
            options.data = this.options.data;
            delete options.disabled;
            delete options.create;
            this._setOptions(options);
            this._update();
        },

        _update: function () {
            var that = this,
                dataNodes = [],
                colorScale,
                nodeEnter,
                oldNodes = this.nodes,
                i;

            if (!this.svg) {
                return;
            }

            this.nodes = [];
            this.links = [];
            this.mapOpacity = 0;

            this.options.data.forEach(function (d) {
                var node = {data: d};
                that.nodes.push(node);
                dataNodes.push(node);
            });

            this.options.constraints.forEach(function (constraint, i) {
                var scale, xScale, yScale;

                constraint.nodeMap = {};
                constraint.index = i;

                if (constraint.type === "x") {
                    scale = d3.scale.linear()
                        .domain(d3.extent(that.options.data, constraint.accessor))
                        .range([0, that.options.width]);
                    constraint.constrain = function (d) {
                        d.x = scale(constraint.accessor(d.data));
                    };
                } else if (constraint.type === "y") {
                    scale = d3.scale.linear()
                        .domain(d3.extent(that.options.data, constraint.accessor))
                        .range([0, that.options.height]);
                    constraint.constrain = function (d) {
                        d.y = scale(constraint.accessor(d.data));
                    };
                } else if (constraint.type === "ordinalx") {
                    scale = d3.scale.ordinal()
                        .domain(that.options.data.map(constraint.accessor))
                        .rangePoints([0, that.options.width], 1);
                    constraint.constrain = function (d) {
                        d.x = scale(constraint.accessor(d.data));
                    };
                } else if (constraint.type === "ordinaly") {
                    scale = d3.scale.ordinal()
                        .domain(that.options.data.map(constraint.accessor))
                        .rangePoints([0, that.options.height], 1);
                    constraint.constrain = function (d) {
                        d.y = scale(constraint.accessor(d.data));
                    };
                } else if (constraint.type === "xy") {
                    xScale = d3.scale.linear()
                        .domain(d3.extent(that.options.data, function (d) {
                            return constraint.accessor(d).x;
                        }))
                        .range([0, that.options.width]);
                    yScale = d3.scale.linear()
                        .domain(d3.extent(that.options.data, function (d) {
                            return constraint.accessor(d).y;
                        }))
                        .range([0, that.options.height]);
                    constraint.constrain = function (d) {
                        d.x = xScale(constraint.accessor(d.data).x);
                        d.y = yScale(constraint.accessor(d.data).y);
                    };
                } else if (constraint.type === "map") {
                    that.mapOpacity = Math.max(that.mapOpacity, constraint.strength);
                    constraint.constrain = function (d) {
                        d.x = d.mapX;
                        d.y = d.mapY;
                    };
                } else if (constraint.type === "link") {
                    constraint.constrain = function () {};
                }
                dataNodes.forEach(function (node) {
                    var values = constraint.accessor(node.data),
                        i,
                        value,
                        constraintNode;
                    if (!tangelo.isArray(values)) {
                        values = [values];
                    }
                    for (i = 0; i < values.length; i += 1) {
                        value = values[i];
                        if (!tangelo.isString(value)) {
                            value = JSON.stringify(value);
                        }
                        if (constraint.type === "link") {
                            if (!constraint.nodeMap[value]) {
                                constraint.nodeMap[value] = {data: node.data, value: value, constraint: constraint};
                                that.nodes.push(constraint.nodeMap[value]);
                            }
                            that.links.push({source: node, target: constraint.nodeMap[value]});
                        } else {
                            constraintNode = {data: node.data, value: value, constraint: constraint};
                            that.nodes.push(constraintNode);
                            that.links.push({source: node, target: constraintNode});
                        }
                    }
                });
            });

            // Copy over x,y locations from old nodes
            if (oldNodes) {
                for (i = 0; i < this.nodes.length && i < oldNodes.length; i += 1) {
                    this.nodes[i].x = oldNodes[i].x;
                    this.nodes[i].y = oldNodes[i].y;
                }
            }

            this.force
                .linkDistance(this.options.linkDistance)
                .linkStrength(function (link) {
                    return link.target.constraint.strength;
                })
                .charge(this.options.charge)
                .gravity(this.options.gravity)
                //.chargeDistance(20)
                .theta(0.1)
                .size([this.options.width, this.options.height])
                .nodes(this.nodes)
                .links(this.links)
                .start();

            this.svg.selectAll(".link").remove();
            this.svg.selectAll(".node").remove();

            this.link = this.svg.selectAll(".link")
                .data(this.links);

            this.link.enter()
                .append("line")
                .classed("link", true)
                .style("opacity", function (d) { return d.target.constraint.strength / 2; })
                .style("stroke", "#999")
                .style("stroke-width", 1);

            this.node = this.svg.selectAll(".node")
                .data(this.nodes);

            nodeEnter = this.node.enter()
                .append("g")
                .classed("node", true)
                .call(this.force.drag);
            nodeEnter.append("circle")
                .style("stroke", "#fff")
                .style("stroke-width", 0.5);
            nodeEnter.append("text")
                .text(function (d) {
                    if (d.constraint) {
                        if (d.constraint.type === "link" ||
                                d.constraint.type === "ordinalx" ||
                                d.constraint.type === "ordinaly") {
                            return d.value;
                        }
                        return "";
                    }
                    return that.options.label(d);
                });

            colorScale = d3.scale.category10();

            this.node
                .style("opacity", function (d) { return d.constraint ? d.constraint.strength : 1; });

            this.node.selectAll("circle")
                .attr("r", function (d) { return d.constraint ? 4 : 6; })
                .style("fill", function (d) { return colorScale(d.constraint ? d.constraint.index : -1); });

            this.force.on("tick", function () { that._tick.call(that); });

            this.force.resume();
            // this.map.trigger("draw");
        },

        _tick: function() {
            var that = this;

            $(this.element.get(0)).find("img").css('opacity', this.mapOpacity);

            that.nodes.forEach(function (node) {
                if (node.constraint) {
                    node.constraint.constrain(node);
                }
            });

            that.link.attr("x1", function (d) { return d.source.x; })
                .attr("y1", function (d) { return d.source.y; })
                .attr("x2", function (d) { return d.target.x; })
                .attr("y2", function (d) { return d.target.y; });

            that.node.attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });
        }
    });
}(window.tangelo, window.jQuery, window.d3, window.google));
