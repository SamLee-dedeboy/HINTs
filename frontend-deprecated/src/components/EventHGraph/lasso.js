import * as d3 from "d3"

const lasso = function(svgNode, items, selectedStyle, notSelectedStyle) {
    var lasso_start = function(svgNode, items, selectedStyle, notSelectedStyle) {
      lasso.items()
          .classed("not_possible",true)
          .classed("selected",false)
          .call(selectedStyle)
    };

  var lasso_draw = function() {
    console.log('draw')
      lasso.possibleItems()
          .classed("not_possible",false)
          .classed("possible",true);
      lasso.notPossibleItems()
          .classed("not_possible",true)
          .classed("possible",false);
  };

  var lasso_end = function() {
      console.log('end')
      lasso.items()
          .classed("not_possible",false)
          .classed("possible",false);
      lasso.selectedItems()
          .classed("selected",true)
          .call(selectedStyle)
      lasso.notSelectedItems()
          .call(notSelectedStyle)
  };
  
  var lasso = d3.lasso()
        .closePathDistance(305) 
        .closePathSelect(true) 
        .targetArea(svgNode)
        .items(items) 
        .on("start",lasso_start) 
        .on("draw",lasso_draw) 
        .on("end",lasso_end); 
    svgNode.call(lasso)
}

export default lasso