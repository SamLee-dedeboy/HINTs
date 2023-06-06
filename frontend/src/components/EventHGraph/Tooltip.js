import * as d3 from "d3"

const MOUSE_POS_OFFSET = 8
const tooltip = (selectionGroup, tooltipDiv, width, height, margin) => {
    selectionGroup.each(function () {
        d3.select(this)
        .on("mouseover.tooltip", handleMouseover)
        .on("mousemove.tooltip", handleMousemove)
        .on("mouseleave.tooltip", handleMouseleave);
    });
    
    function handleMouseover() {
        // show/reveal the tooltip, set its contents,
        // style the element being hovered on
        showTooltip();
        setContents(d3.select(this).datum(), tooltipDiv);
        setStyle(d3.select(this));
    }
    
    function handleMousemove(event) {
        // update the tooltip's position
        // add the left & top margin values to account for the SVG g element transform
        setPosition(event.clientX, event.clientY);
    }
    
    function handleMouseleave() {
        // do things like hide the tooltip
        // reset the style of the element being hovered on
        hideTooltip();
        resetStyle(d3.select(this));
    }
    
    function showTooltip() {
        tooltipDiv.style("display", "block");
    }
    
    function hideTooltip() {
        tooltipDiv.style("display", "none");
    }

    function setStyle(selection) {
        selection.attr("stroke-width", "3");
    }
    function resetStyle(selection) {
        selection.attr("stroke-width", "1");
    }

    
    function setPosition(mouseX, mouseY) {
        tooltipDiv
        .style(
            "top",
            mouseY > height / 2 
            ? `${mouseY + MOUSE_POS_OFFSET}px` 
            : `${mouseY + MOUSE_POS_OFFSET}px` 
            // : "initial"
        )
        .style(
            "right",
            mouseX > width / 2
            // ? `${width - mouseX + MOUSE_POS_OFFSET}px`
            // : `${width - mouseX + MOUSE_POS_OFFSET}px`
            ? "initial" 
            : "initial"
        )
        .style(
            "bottom",
            mouseY > height / 2
            // ? `${height - mouseY + MOUSE_POS_OFFSET}px`
            ? "initial"
            : "initial"
        )
        .style(
            "left",
            mouseX > width / 2 
            ? `${mouseX + MOUSE_POS_OFFSET}px`
            : `${mouseX + MOUSE_POS_OFFSET}px` 
            // : "initial"
        );
    }
}

function setContents(datum, tooltipDiv) {
    // customize this function to set the tooltip's contents however you see fit
    // console.log({datum})

    tooltipDiv
      .selectAll("p")
      .data(Object.entries(Object.getPrototypeOf(datum)))
      .join("p")
      .filter(([key, value]) => value !== null && value !== undefined)
      .html(
        ([key, value]) => {
            if(key == 'mentions') 
                return `<strong>${key}</strong>: ${Array.from(new Set(value.map(mention => mention.mention))).join(", ")}, ${value.length}`   
            else 
                return `<strong>${key}</strong>: ${ typeof value === "object" ? value.toLocaleString("en-US") : value }`
        }
      );
  }

export default tooltip
