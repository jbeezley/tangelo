/*jslint browser: true*/

(function (tangelo, $, d3) {
    'use strict';
    
    // A function that throws an error when called
    function abstractFunction() {
        throw new Error('Invalid call to abstract method in AbstractMapSVG');
    }
    
    // A private class to create and manage an svg layer displayed
    // over the map.  Two types of layers are supported: static and moving.
    // A moving layer gets translated appropriately during drag events, while
    // a static layers remains fixed.
    //
    // Possible additional features for layers:
    //
    //    z coordinates for managing display order,
    //    handling mouse over events,
    //    show/hide
    //
    function SVGLayer(elem, options) {
        var svg, classes, moving, id;
        
        options = options || {};
        moving = (options.moving !== undefined) ? options.moving : true;
        
        classes = ['svglayer'];
        if (moving) {
            classes.push('moving');
        } else {
            classes.push('static');
        }
        
        id = 'svglayer-' + tangelo.uniqueID();

        svg = d3.select(elem)
                    .append('g')
                        .attr('class', classes.join(' '))
                        .attr('id', id);
        
        this.getSVG = function () {
            return svg;
        };
    }
    
    // Here is just a simple class for managing events and callbacks
    // will need to be connected with subclasses to trigger properly
    // on map events
    function Event() {
        var handlers = [];
        this.trigger = function () {
            handlers.forEach(function (h) {
                h(); // need to manage `this` and `arguments` here
            });
        };
    }

    tangelo.AbstractMapSVG = function (elem, options) {
        
        // private variables
        var svgLayers, mapDiv, id, that, ready;
        
        // private variable initialization
        
        // keep track of the original `this`
        that = this;

        // generate a unique ID for the DOM element
        id = "mapsvg-" + tangelo.uniqueID();

        // start with no svg layers
        svgLayers = [];

        // create a new div for the map
        mapDiv = d3.select(elem)
            .append('div')
                .attr('id', id)
                .style('width', $(elem).width() + 'px')
                .style('height', $(elem).height() + 'px')
                .node();
        
        // public function initialization
        this.addLayer = function (name, layerOptions) {
            // add an svg layer to the map
            
            if (svgLayers.hasOwnProperty(name)) {
                throw new Error('A layer named ' + name + ' already exists');
            }
            svgLayers[name] = new SVGLayer(this.getSVG(), layerOptions);
        };

        // all possible map events are stored here
        this.events = {
            zoom: new Event(),
            drag: new Event(),
            load: new Event(),
            // etc...
        };
        
        // call subclass method to create the map on the given DOM element
        // set ready to true when finished
        ready = false;
        this.createMap(mapDiv, function () {
            ready = true;
        });
        
    };
    
    var proto = tangelo.AbstractMapSVG.prototype;

    // defines a point on an svg in pixel coordinates
    proto.Point = function (x, y) {
        this.x = x;
        this.y = y;
    };
    
    // defines a point on an svg in lat/lng coordinates
    proto.LatLng = function (lat, lng) {
        this.lat = lat;
        this.lgn = lng;
    };

    // defines a rectangle in lat/lng coordinates
    proto.AbstractLatLngBounds = function (sw, ne) {
        this.sw = sw;
        this.ne = ne;
        this.getSouthWest = function () { return this.sw; };
        this.getNorthEast = function () { return this.ne; };
    };


    // define abstract methods that should be provided by inherited classes

    // returns top level svg element
    proto.getSVG = abstractFunction;
    
    // generate the map under the given element
    proto.createMap = abstractFunction;

    // converts a point object to a latlng object
    proto.pointToLatLng = abstractFunction;

    // converts a latlng object to a point object
    proto.latLngToPoint = abstractFunction; 

    // abstract methods for LatLngBounds class
    // (following google.maps.LatLngBounds, these
    // should all be simple calls to the mapping
    // interface)
    proto = proto.AbstractLatLngBounds.prototype;
    proto.contains = abstractFunction;
    proto.extend = abstractFunction;
    proto.getCenter = abstractFunction;
    proto.intersects = abstractFunction;
    proto.union = abstractFunction;


}(window.tangelo, window.$, window.d3));
