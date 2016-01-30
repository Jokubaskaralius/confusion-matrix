"use strict";

$(function () {

  // now need to render the confusion matrix using backbone
  // to make sure that this is rendered after all the slide
  // stuff has been set up
  var matrix = new confusion.models.Matrix();
  var view = new confusion.views.Matrix({
    el: "#confusion_matrix",
    model: matrix
  }).render();
  
  // instantiate the view for the controls
  var view = new confusion.views.Controls({
    el: "#confusion_matrix_controls",
    model: matrix
  }).render();	    

});
