"use strict";

// this is the only variable that gets added to the global
// namespace. stole this syntax from d3
var confusion = {version: "0.0.1"};

"use strict";
(function(){

    // add models to the namespace
    confusion.models = {};

    // add Observation to the models namespace
    confusion.models.Observation = Backbone.Model.extend({

	defaults: {
	    quadrant: null
	},

	initialize: function (args) {

	    _.extend(this, Backbone.Events);

	    // store a reference to the matrix for convenience
	    this.matrix = args.matrix;

	},

	// convenience method for identifying tp, fp, fn, tn labels
	quadrant_label: function () {
	    return this.get("quadrant").label();
	},
	
	validate: function (args) {

	    // each observation belongs to one and only one quadrant
	    if (_.isNull(args.quadrant)) {
		return "quadrant for this observation has not been defined";
	    }

	}

    });

    confusion.models.Quadrant = Backbone.Model.extend({

	defaults: {
	    // TN by default
	    is_correct: true,
	    is_positive: false
	},

	initialize: function (args) {

	    // every quadrant consists of a collection of observations
	    var observation_collection = Backbone.Collection.extend({
		model: confusion.models.Observation

	    });
	    this.observations = new observation_collection();

	    // store a reference to the matrix parent object for
	    // convenience
	    this.matrix = args.matrix;
	    
	},

	// method to get the common label for the quadrant
	label: function () {
	    if (this.get("is_correct")) {
		if (this.get("is_positive")) {
		    return "tp";
		}
		else {
		    return "tn";
		}
	    }
	    else {
		if (this.get("is_positive")) {
		    return "fn";
		}
		else {
		    return "fp";
		}
	    }
	},

	validate: function (args) {

	}

    });

    // add Observation to the models namespace
    confusion.models.Matrix = Backbone.Model.extend({

	defaults: {
	    n_observations: Math.pow(25, 2),

	    epsilon: 0.001,
	    prevalence: 0.2,
	    precision: 0.7,
	    recall: 0.9
	},

	initialize: function (args) {

	    // extend this model to listen for events
	    _.extend(this, Backbone.Events);
	    this.bind("change:prevalence", this.change_prevalence, this);
	    this.bind("change:precision", this.change_precision, this);
	    this.bind("change:recall", this.change_recall, this);

	    // instantiate all of the quadrants. each quadrant is in
	    // charge of keeping track of each observation instance
	    // that is in this quadrant
	    var bools = [true, false];
	    this.quadrants = {};
	    _.each(bools, function (is_correct) {
		_.each(bools, function (is_positive) {
		    var quadrant = new confusion.models.Quadrant({
			is_correct: is_correct,
			is_positive: is_positive,
			matrix: this
		    });
		    this.quadrants[quadrant.label()] = quadrant;
		}, this);
	    }, this);
	    
	    // every matrix has a collection of observations
	    var observation_collection = Backbone.Collection.extend({
		model: confusion.models.Observation,

		initialize: function (args, opts) {

		    // call the super initialize method
		    Backbone.Collection.prototype.initialize.call(
			this, args, opts
		    );

		    // attach the matrix model to this collection
		    this.matrix = opts.matrix;

		    // extend this class to maintain all of the
		    // quadrant collections at the same time
		    _.extend(this, Backbone.Events);
		    this.bind("add", this.add_to_quadrant, this);
		    this.bind("remove", this.remove_from_quadrant, this);
		    this.bind("change:quadrant", this.change_quadrant, this);
		},

		add_to_quadrant: function (observation) {
		    var label = observation.get("quadrant").label();
		    this.matrix.quadrants[label].observations.add(observation);
		},
		
		remove_from_quadrant: function () {
		    throw("remove_from_quadrant not implemented yet");
		},
		
		change_quadrant: function (observation, quadrant, opts) {
		    var l = observation.get("quadrant").label();
		    var pl = observation.previous("quadrant").label();
		    this.matrix.quadrants[pl].observations.remove(observation);
		    this.matrix.quadrants[l].observations.add(observation);
		    observation.trigger("quadrant_changed", {});
		}

	    });
	    this.observations = new observation_collection([], {matrix: this});

	    // instantiate the collection of observations
	    _.each(_.range(args.n_observations), function (e, i, l) {
		var obs = new confusion.models.Observation({
		    quadrant: this.choose_quadrant(i),
		    matrix: this
		});
		this.observations.add(obs);
	    }, this);

	    

	},

	set: function (attrs, opts) {
	    Backbone.Model.prototype.set.call(this, attrs, opts);

	    // provide functionality for triggering the change:f1
	    // event anytime the recall, precision, or prevalence is
	    // changed. This is a quick and dirty way of emulating
	    // ember's computed properties functionality. 
	    // http://emberjs.com/documentation/#toc_computed-properties-getters
	    if ("recall" in attrs || 
		"precision" in attrs || 
		"prevalence" in attrs) {
		this.trigger("change:f1");
	    }
	},
	
	random_quadrant: function () {
	    var result = {
		is_correct: false,
		is_positive: true
	    };

	    // is this observation truly positive?
	    var error_rate;
	    if (Math.random() < this.get("prevalence")) {
		result.is_positive = true;
		error_rate = this.fnr();
	    }
 	    else {
		result.is_positive = false;
		error_rate = this.fpr();
	    }

	    // is this observation a mistake?
	    if (Math.random() < error_rate) {
		result.is_correct = false;
	    }
	    else {
		result.is_correct = true;
	    }

	    // return the correct quadrant
	    if (result.is_correct && result.is_positive) {
		return this.quadrants["tp"];
	    }
	    else if (result.is_correct && !result.is_positive) {
		return this.quadrants["tn"];
	    }
	    else if (!result.is_correct && result.is_positive) {
		return this.quadrants["fn"];
	    }
	    else if (!result.is_correct && !result.is_positive) {
		return this.quadrants["fp"];
	    }
	    else {
		throw("huh? what quadrant are you looking for anyway");
	    }

	},

	cumulative_counts: function () {
	    var cumulative = {};
	    cumulative.tp = this.tp();
	    cumulative.fn = cumulative.tp + this.fn();
	    cumulative.fp = cumulative.fn + this.fp();
	    cumulative.tn = cumulative.fp + this.tn();
	    return cumulative;
	},

	choose_quadrant: function (index) {

	    // calculate the cumulative number of observations in each
	    // confusion matrix cell and choose a quadrant in a manner
	    // that reduces the jitter as much as possible when
	    // changing the controls.
	    var cumulative = this.cumulative_counts();
	    if ((cumulative.tn-this.get("n_observations"))>1) {
		throw("cumulative count not equal to n_observations");
	    }
	    
	    if (index<Math.round(cumulative.tp)) {
		return this.quadrants["tp"];
	    }
	    else if (index<Math.round(cumulative.fn)) {
		return this.quadrants["fn"];
	    }
	    else if (index<Math.round(cumulative.fp)) {
		return this.quadrants["fp"];
	    }
	    else {
		return this.quadrants["tn"];
	    }
	},

	update_quadrants: function () {

	    // count the change in the number of observations for each
	    // quadrant
	    var delta_count = {tp: 0, fn: 0, fp: 0, tn: 0};
	    var quadrant = null;
	    _.each(this.observations.models, function (o, i, l) {
		quadrant = this.choose_quadrant(i);
		delta_count[quadrant.label()] += 1;
		delta_count[o.get("quadrant").label()] -= 1;
	    }, this);

	    // console.log(
	    // 	delta_count.tp + ' ' +
	    // 	delta_count.fn + ' ' +
	    // 	delta_count.fp + ' ' +
	    // 	delta_count.tn
	    // );

	    // first identify all of the observations that need to be
	    // removed from one quadrant
	    var observations, changing_quadrants = [];
	    _.each(delta_count, function (count, label, object) {
	    	observations = this.quadrants[label].observations.models;
	    	if (count < 0) {
	    	    _.each(_.last(observations, -count), function (o, i, l) {
	    		changing_quadrants.push(o);
	    	    }, this);
	    	}
	    }, this);

	    // reset these observations into new quadrants
	    var i = 0;
	    _.each(delta_count, function (count, label, object) {
	    	for (;count>0; count-=1) {
		    changing_quadrants[i].set({
			quadrant: this.quadrants[label]
		    });
		    i += 1;
	    	}
	    }, this);

	},

	change_prevalence: function (model, prevalence, opts) {
	    this.update_quadrants();
	},
	change_precision: function (model, precision, opts) {
	    this.update_quadrants();
	},
	change_recall: function (model, recall, opts) {
	    this.update_quadrants();
	},

	// methods to calculate various statistical measures
	n_responsive: function (attrs) {
	    var prevalence = (attrs && attrs.prevalence) || this.get("prevalence");
	    return this.get("n_observations")*prevalence;
	},
	n_nonresponsive: function (attrs) {
	    var prevalence = (attrs && attrs.prevalence) || this.get("prevalence");
	    return this.get("n_observations")*(1-prevalence);
	},
	precision_ratio: function (attrs) {
	    var precision = (attrs && attrs.precision) || this.get("precision");
	    return (1 - precision) / precision;
	},
	tp: function (attrs) {
	    var recall = (attrs && attrs.recall) || this.get("recall");
	    return this.n_responsive(attrs)*recall;
	},
	fn: function (attrs) {
	    var recall = (attrs && attrs.recall) || this.get("recall");
	    return this.n_responsive(attrs) * (1-recall);
	},
	tn: function (attrs) {
	    return this.n_nonresponsive(attrs) - this.fp(attrs);
	},
	fp: function (attrs) {
	    return Math.min(this.tp(attrs)*this.precision_ratio(attrs), 
	    		    this.n_nonresponsive(attrs));
	},
	fpr: function () {
	    var x = this.fp() / (this.tn() + this.fp());
	    if (_.isNaN(x)) {
		return 0;
	    }
	    return x;
	},
	fnr: function () {
	    return 1.0 - this.get("recall");
	},
	f1: function () {
	    var p = this.get("precision");
	    var r = this.get("recall");
	    var x = 2*p*r/(p+r);
	    if (_.isNaN(x)) {
		return 0;
	    }
	    return x;
	},
	accuracy: function () {
	    var x = (this.tp() + this.tn()) / this.get("n_observations");
	    if (_.isNaN(x)) {
		return 0;
	    }
	    return x;
	},
	
	is_valid_triplet: function (attrs) {
	    var prevalence = attrs.prevalence || this.get("prevalence");
	    var precision = attrs.precision || this.get("precision");
	    var recall = attrs.recall || this.get("recall");
	    var lt1 = prevalence*((1-precision)/precision*recall + 1);
	    return (lt1<1);
	},

	reset_valid_triplet: function (attrs) {
	    var prevalence = this.get("prevalence");
	    var precision = this.get("precision");
	    var recall = this.get("recall");

	    // prevalence has been moved to an illegal value
	    var x = {"reset": true};
	    var epsilon=this.get("epsilon");
	    if (attrs.prevalence !== undefined) {
		x.prevalence = 1 / ((1-precision)/precision*recall + 1)-epsilon;
	    }
	    if (attrs.precision !== undefined) {
		var a = (1/prevalence - 1)/recall;
		x.precision = 1 / (1+a)+epsilon;
	    }
	    if (attrs.recall !== undefined) {
		x.recall = (1/prevalence - 1) / ((1-precision)/precision) - epsilon;
	    }
	    this.set(x);
	},

	validate: function (attrs) {
	    if (attrs.prevalence!==undefined && !_.isNumber(attrs.prevalence)) {
		var msg = "prevalence must be a number";
	    	return msg;
	    }
	    if (attrs.recall!==undefined && !_.isNumber(attrs.recall)) {
		var msg = "recall must be a number";
	    	return msg;
	    }
	    if (attrs.precision!==undefined && !_.isNumber(attrs.precision)) {
		var msg = "precision must be a number";
	    	return msg;
	    }

	    // check to confirm that this is a valid (prevalence,
	    // precision, recall) triplet. If not, do not validate
	    // this save
	    if (!this.is_valid_triplet(attrs)) {
		var attr_names = _.without(_.keys(attrs), "reset");

		// this can have more than one attribute when the
		// scenario buttons are pressed (which means that the
		// scenario is out of bounds --- oy ve!)
		if (attr_names.length === 1) {
		    this.trigger("error:values", true, attr_names[0]);
		    this.reset_valid_triplet(attrs);
		}
		var msg = "illegal (prevalence, precision, recall) triplet";
		return msg;
	    }
	    if (attrs.reset !== true) {
		this.trigger("error:values", false);
	    }

	}

    });

})();
