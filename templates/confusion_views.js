"use strict";

(function(){

    // add models to the networks namespace
    confusion.views = {};

    confusion.views.Observation = Backbone.View.extend({

	events: {

	},

	attrs: {
	    // "r": 5,
	    "stroke": "none",
	},

	initialize: function (opts) {

	    // call the super initialize method
	    Backbone.View.prototype.initialize.call(this, opts);

	    // add a reference to the view from the model
	    this.model.view = this;

	    // add a reference to the canvas for internal use
	    this.canvas = opts.canvas;

	    // create some blank raphael elements so that we can
	    // properly associate the DOM element with the Raphael
	    // object
	    this.element = this.canvas.circle();

	    // override reference to this.el to correctly refer to DOM
	    // element for properly using backbone events
	    this.el = this.element.node;

	    // bind a change:quadrant event to the render method
	    this.model.bind("quadrant_changed", this.render, this);

	},

	fill_attrs: function () {
	    var q = this.model.get("quadrant");
	    var attrs = q.view.fill_attrs();
	    var is_positive = q.get("is_positive");
	    var is_correct = q.get("is_correct");
	    
	    // coloring the dots
	    _.extend(attrs, {
	    	"stroke-width": 1.2,
		"fill-opacity": 1,
	    });

	    if (is_positive) {
	    	if (is_correct) { //TP, black
	    	    attrs.fill = q.view.tp_color;
		    attrs.stroke = "lightgrey";
	    	}
	    	else { // FN, red
	    	    attrs.fill = q.view.tp_color;
		    attrs.stroke = "lightgrey"
	    	}
	    }
	    else {
	    	if (is_correct){ // TN, white
	    	    attrs.fill = q.view.tn_color;
		    attrs.stroke = "grey";
	    	}
	    	else { // FP, yellow
	    	    attrs.fill = q.view.tn_color;
		    attrs.stroke = "grey";
	    	}
	    }

	    return attrs;
	},

	render: function (opts) {

	    // render the circle for this element
	    var bounds = this.model.get("quadrant").view.inner_bounds;

	    // calculate the radius of the event based on trying to
	    // fit all of the observations in the same quadrant with
	    // 'r' padding around each observation
	    var n = this.model.matrix.get("n_observations");
	    var sqrtn = Math.ceil(Math.sqrt(n));
	    var r = bounds.w / (3*sqrtn + 1);

	    // calculate the index of this element -- this might be
	    // really slow...
	    var a = _.indexOf(this.model.get("quadrant").observations.models, 
			      this.model);
	    var i = a % sqrtn;
	    var j = Math.floor(a/sqrtn);

	    var attrs = {
		"r": r,
		"cx": (3*i+2)*r + bounds.x,
		"cy": (3*j+2)*r + bounds.y
	    };
	    
	    _.extend(attrs, this.fill_attrs());

	    this.element.attr(this.attrs);
	    if (opts.initial !== undefined && opts.initial===true) {
		this.element.attr(attrs);
	    }
	    else {
		this.element.animate(attrs, 400, ">");
	    }

	    return this;
	}

    });

    confusion.views.Quadrant = Backbone.View.extend({

	events: {

	},

	attrs: {
	    "cell": {
		"fill": "none",
		"stroke-width": 3,
		"stroke": "black", //"rgb(196,196,196)",
		"r": 0
	    },
	    "label": {
		// "fill":	"rgb(156,156,156)",
		"fill": "rgb(96,96,96)", //"rgb(196,196,196)"
		"font-family": "CallunaSansRegular"
	    }
	},

	initialize: function (opts) {

	    // call the super initialize method
	    Backbone.View.prototype.initialize.call(this, opts);

	    // add a reference to the view from the model
	    this.model.view = this;

	    // save a reference to the canvas for internal use
	    this.canvas = opts.canvas;

	    // create some blank raphael elements so that we can
	    // properly associate the DOM element with the Raphael
	    // object
	    this.cell = this.canvas.rect();
	    this.label_back = this.canvas.text();
	    this.label_front = this.canvas.text();
	    this.label = this.canvas.set(this.label_back, this.label_front);

	    // override reference to this.el to correctly refer to DOM
	    // element for properly using backbone events
	    this.el = this.cell.node;

	    // since we manually overrode this.el, we need to rebind
	    // events specified in the 'events' object
	    this.delegateEvents(this.events);

	    // placeholder object to keep track of inner bounds on
	    // quadrant. this is calculated in the render method
	    this.inner_bounds = null;

	    // initialize all of the circles associated with this
	    // Quadrant
	    this.observations = [];
	    _.each(this.model.observations.models, function (o, i, l) {
		this.observations.push(new confusion.views.Observation({
		    model: o,
		    canvas: this.canvas
		}));
	    }, this);

	},

	tp_color: "black",
	tn_color: "white",
	fp_color: "rgb(0,55,166)",//"rgb(55,126,184)",
	fn_color: "rgb(243,235,0)",//"rgb(228,26,28)",
	
	fill_attrs: function () {
	    var attrs = {"fill": undefined, "fill-opacity": 0.5};
	    var is_positive = this.model.get("is_positive");
	    var is_correct = this.model.get("is_correct");

	    if (is_correct) {
		if (is_positive) { //true positive
		    attrs.fill = this.tp_color;
		    attrs["fill-opacity"] = 1;
		}
		else{ //true negative
		    attrs.fill = this.tn_color
		    attrs["fill-opacity"] = 1;
		}
	    }
	    else{
		if (is_positive) { //false positive
		    attrs.fill = this.fp_color
		}
		else{ //false negative
		    attrs.fill = this.fn_color
		}
	    }

	    // if ((is_positive && is_correct) || (!is_positive && !is_correct)) {
	    // 	attrs.fill = this.true_color;
	    // }
	    // else {
	    // 	attrs.fill = this.false_color;
	    // }
	    return attrs;
	},

	render: function () {

	    var i,j
	    if (this.model.label() === "tp") {
		i=0;
		j=0;
	    }
	    else if (this.model.label() === "fp") {
		i=0;
		j=1;
	    } 
	    else if (this.model.label() === "fn") {
		i=1;
		j=0;
	    } 
	    else if (this.model.label() === "tn") {
		i=1;
		j=1;
	    } 

	    // add the confusion matrix
	    var stroke = this.attrs.cell["stroke-width"];
	    var size = (this.canvas.width-this.canvas.label_padding-stroke
			-this.canvas.controls_padding)/2;
	    var circle_radius = 5;

	    // create the square boundary
	    this.cell.attr({
		x: stroke/2 + size*i + this.canvas.label_padding,
	    	y: stroke/2 + size*j + this.canvas.label_padding,
	    	width: size, 
		height: size
	    }).attr(this.attrs.cell).attr(this.fill_attrs());

	    // create the text label
	    this.label.attr({
		x: stroke/2 + size*(i+0.5) + this.canvas.label_padding,
		y: stroke/2 + size*(j+0.5) + this.canvas.label_padding,
		text: this.model.label().toUpperCase(),
	    }).attr(this.attrs.label).attr({
		"font-size": this.canvas.large_font_size
	    });
	    this.label_back.attr({
			"stroke": "none",
			"stroke-width": 5
			});
	    if (this.model.label() === "tp" || this.model.label() === "fn"){
		this.label.attr({
			"fill":"rgb(255,255,255)"
			    });
	    }
	    // remember the quadrant bounds
	    this.inner_bounds = {
	    	x: this.cell.attr("x") + stroke/2,
	    	y: this.cell.attr("y") + stroke/2,
	    	w: this.cell.attr("width") - stroke,
	    	h: this.cell.attr("height") - stroke
	    };

	    // render all of the observations
	    _.each(this.observations, function (v, i, l) {
		v.render({initial: true});
	    }, this);

	    return this;
	}

    });

    confusion.views.Controls = Backbone.View.extend({

	events: {

	    // // these refer to changing the sliders, which is now
	    // // handled by jquery
	    // "change .prevalence": "slider_prevalence",
	    // "change .precision": "slider_precision",
	    // "change .recall": "slider_recall",

	    // these refer to changing the inputs
	    "input .prevalence": "input_prevalence",
	    "input .precision": "input_precision",
	    "input .recall": "input_recall"
	},

	initialize: function (opts) {

	    // bind change events to the render method
	    this.model.bind("change:prevalence", this.change_prevalence, this);
	    this.model.bind("change:precision", this.change_precision, this);
	    this.model.bind("change:recall", this.change_recall, this);
	    this.model.bind("change:f1", this.change_f1, this);

	    this.model.bind("error:values", this.error_values, this);
	},

	update_label: function (name, value) {
	    if (name==="prevalence" || name==="precision" || name==="recall") {
		$(this.el).find("input."+name).attr({
		    "value": s.sprintf("%0.2f",Number(value))
		});
	    }
	    else {
		$(this.el).find("span."+name).html(
		    s.sprintf("%0.2f",Number(value))
		);
	    }
	},

	// the change_ methods are used to effectively re-render the
	// slider and text inputs whenever the model changes.
	change_prevalence: function (model, value) {
	    $("#prevalence").slider({value: value});
	    this.update_label("prevalence", value);
	},
	change_precision: function (model, value) {
	    $("#precision").slider({value: value});
	    this.update_label("precision", value);
	},
	change_recall: function (model, value) {
	    $("#recall").slider({value: value});
	    this.update_label("recall", value);
	},
	change_f1: function () {
	    var value = this.model.f1();
	    $("#f1").css({"width": 100*value+'%'});
	    this.update_label("f1", value);
	},

	error_values: function (is_error, attr_name) {
	    if (is_error) {
		var change_method = "change_" + attr_name;

		$('#'+attr_name).parent().addClass("error");

		// on error, reset the values of the various
		// labels. sliders are handled separately.
		this[change_method](this.model,this.model.get(attr_name));
		this.change_f1();
	    }
	    else {
		$(".control").removeClass("error");
	    }
	},
	

	input_prevalence: function () {
	    var x = Number($("input.prevalence").attr("value"));
	    this.model.set({prevalence: x});
	    $("#prevalence").attr({"value": x});
	    $(".scenario").removeClass("selected");
	    this.change_f1();
	},
	input_precision: function () {
	    var x = Number($("input.precision").attr("value"));
	    this.model.set({precision: x});
	    $("#precision").attr({"value": x});
	    $(".scenario").removeClass("selected");
	    this.change_f1();
	},
	input_recall: function () {
	    var x = Number($("input.recall").attr("value"));
	    this.model.set({recall: x});
	    $("#recall").attr({"value": x});
	    $(".scenario").removeClass("selected");
	    this.change_f1();
	},

	// this method is used to set particular scenarios to really
	// quickly see different modes of reviewer accuracy
	set_scenario: function (args) {

	    // manipulate the selected scenario classes
	    $(".scenario").removeClass("selected");
	    $(args.scenario).addClass("selected");

	    var set_args = {};
	    if (args.prevalence !== undefined) {
		set_args.prevalence = args.prevalence;
	    }
	    if (args.precision !== undefined) {
		set_args.precision = args.precision;
	    }
	    if (args.recall !== undefined) {
		set_args.recall = args.recall;
	    }
	    this.model.set(set_args);
	},

	render: function () {

	    // initialize the prevalence element
	    $(this.el).append(
	    	'<div class="first control">'+
	    	'<label class="prevalence" for="prevalence">prevalence</label>'+
	    	'<div id="prevalence" ></div>'+
	    	'<input type="number" class="prevalence" min=0 max=1 step=.01 value="" />'+
	    	"</div>"
	    );
	    $(this.el).append(
	    	'<div class="control">'+
	    	'<label class="precision" for="precision">precision</label>'+
	    	'<div id="precision" ></div>'+
	    	'<input type="number" class="precision" min=0 max=1 step=0.01 value="" />'+
	    	"</div>"
	    );
	    $(this.el).append(
	    	'<div class="control">'+
	    	'<label class="recall" for="recall">recall</label>'+
	    	'<div id="recall" ></div>'+
	    	'<input type="number" class="recall" min=0 max=1 step=0.01 value="" />'+
	    	"</div>"
	    );

	    $(this.el).append(
		'<div class="control">'+
		'<label class="f1" for="f1">f1</label>'+
		'<div id="f1_container" class="ui-slider ui-slider-horizontal ui-widget ui-widget-content ui-corner-all"><div id="f1" class="ui-slider ui-slider-horizontal ui-widget ui-widget-content ui-corner-all"></div></div>'+
		'<span class="f1"></span>'+
		"</div>"
	    );

	    // slider js
	    var temper = this;

	    // UI slider function
	    $("#prevalence").slider({
		value:temper.model.get("prevalence"),
		min:0,
		max:1.0,
		step:.01,
		slide: function(event, ui) {
		    var args = {"prevalence": ui.value};
		    temper.model.set(args);
		    return temper.model.is_valid_triplet(args);
		}
	    });			     

	    // UI slider for precision
	    $("#precision").slider({
		value:temper.model.get("precision"),
		min:0,
		max:1.0,
		step:.01,
		slide: function(event, ui) {
		    var args = {"precision": ui.value};
		    temper.model.set(args);
		    return temper.model.is_valid_triplet(args);
		}
	    });			     
	    
	    // UI slider for recall
	    $("#recall").slider({
		value:temper.model.get("recall"),
		min:0,
		max:1.0,
		step:.01,
		slide: function(event, ui) {
		    var args = {"recall": ui.value};
		    temper.model.set(args);
		    return temper.model.is_valid_triplet(args);
		}
	    });			     
	    
	    // update the labels of the sliders
	    this.update_label("prevalence", this.model.get("prevalence"));
	    this.update_label("precision", this.model.get("precision"));
	    this.update_label("recall", this.model.get("recall"));
	    this.update_label("f1", this.model.f1());

	    // add scenarios for presetting the confusion matrix to
	    // different scenarios
	    $(this.el).append(
	    	'<div class="current scenario">'+
	    	'Current reviewers'+
	    	'</div>'
	    );
	    $(this.el).append(
	    	'<div class="lazy scenario">'+
	    	'100% responsive reviewers'+
	    	'</div>'
	    );
	    $(this.el).append(
	    	'<div class="random scenario">'+
	    	'Coin flip reviewers'+
	    	'</div>'
	    );
	    $(this.el).append(
	    	'<div class="trec scenario">'+
	    	'TREC reviewers'+
	    	'</div>'
	    );
	    $(".current.scenario").click(function (matrix_view) { 
	    	return function (event) {
		  var url="hmmmm.json";
		    $.getJSON(url, function(data){
			matrix_view.set_scenario({
			    scenario: this,
			    prevalence: data.current_values.prevalence,
			    precision: data.current_values.precision,
			    recall: data.current_values.recall
			});
		    });
		    return false;
	    	}
	    }(this));
	    
	    $(".lazy.scenario").click(function (matrix_view) { 
	    	return function (event) {
	    	    matrix_view.set_scenario({
			scenario: this,
	    		precision: 0,
	    		recall: 1
	    	    });
	    	    return false;
	    	}
	    }(this));
	    $(".random.scenario").click(function (matrix_view) { 
	    	return function (event) {
	    	    var p = matrix_view.model.get("prevalence");
	    	    var n = matrix_view.model.get("n_observations");
	    	    var nr = p*n;
	    	    var nnr = n - nr;
	    	    var tp = 0.5*nr;
	    	    var fp = 0.5*nnr;
	    	    var precision = tp / (tp + fp);
		    
	    	    matrix_view.set_scenario({
			scenario: this,
	    	    	precision: precision,
	    	    	recall: 0.5
	    	    });
	    	    return false;
	    	}
	    }(this));
	    $(".trec.scenario").click(function (matrix_view) { 
	    	return function (event) {
	    	    matrix_view.set_scenario({
			scenario: this,
	    	    	precision: 0.55,
	    	    	recall: 0.51,
	    	    });
	    	    return false;
	    	}
	    }(this));
	    
	    return this;
	}
	
    });

    
    confusion.views.Matrix = Backbone.View.extend({

	

	render: function () {

	    // instantiate the canvas
	    var width = $(this.el).width();
	    var height = $(this.el).height();
	    this.canvas = Raphael(this.el, width, height);
	    this.canvas.label_padding = width / 8;
	    this.canvas.controls_padding = 0;
	    this.canvas.large_font_size = this.canvas.label_padding/2*0.9;
	    this.canvas.small_font_size = this.canvas.label_padding/2*0.8;

	    // render the quadrants (which automatically renders all
	    // of the observations in the quadrants)
	    this.quadrants = {};
	    _.each(this.model.quadrants, function (quadrant, label, obj) {
		this.quadrants[label] = new confusion.views.Quadrant({
		    model: quadrant,
		    canvas: this.canvas
		}).render();
	    }, this);

	    // now that all of the quadrants have been rendered,
	    // re-stack the quadrants and labels to make sure that the
	    // observations always show up between the cell and the
	    // label
	    _.each(this.quadrants, function (quadrant_view, label, obj) {
		quadrant_view.cell.toBack();
		quadrant_view.label.toFront();
	    }, this);


	    // label the confusion matrix
	    var w=this.canvas.width-this.canvas.controls_padding;
	    var p=this.canvas.label_padding;
	    var h=this.canvas.height;
	    var attrs={
		"font-size": this.canvas.small_font_size,
		"fill": "rgb(96,96,96)", //"rgb(196,196,196)"
		"font-family": "CallunaSansRegular"
	    };
	    var attrs2= {
		"font-size": this.canvas.large_font_size,
		"fill": "rgb(96,96,96)", //"rgb(196,196,196)"
		"font-family": "CallunaSansRegular",
		"font-weight": "bold",
	    }

	    this.labels = this.canvas.set();

	    this.labels.push(this.canvas.text(
		(w-p)/2+p,
		p/4,
		"Classifier"
	    ).attr(attrs2));
	    this.labels.push(this.canvas.text(
		(w-p)/4+p,
		3*p/4,
		"Positive"
	    ).attr(attrs));
	    this.labels.push(this.canvas.text(
		3*(w-p)/4+p,
		3*p/4,
		"Negative"
	    ).attr(attrs));
	    this.labels.push(this.canvas.text(
		p/4,
		(w-p)/2+p,
		"Truth"
	    ).attr(attrs2).rotate(270));
	    this.labels.push(this.canvas.text(
		3*p/4,
		(w-p)/4+p,
		"Positive"
	    ).attr(attrs).rotate(270));
	    this.labels.push(this.canvas.text(
		3*p/4,
		3*(w-p)/4+p,
		"Negative"
	    ).attr(attrs).rotate(270));
	    // _.each(this.quadrants, function (quadrant_view, label) {
	    // 	this.labels.push(quadrant_view.label);		
	    // }, this);

	    return this;
	}
	
	});



})();
