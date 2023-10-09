<script lang=ts context="module">
  import * as d3 from "d3";
  import { createEventDispatcher, onMount, tick } from "svelte";
  import borders from "./utils/BorderUtils";
  import zoom from "./utils/ZoomUtils";
  import sfc from "./utils/SFCUtils";
  import tags from "./utils/TagUtils";
  import * as DragUtils from "./utils/DragUtils";

  const margin = {
    left: 30,
    right: 30,
    top: 30,
    bottom: 30,
  };
  const centerAreaOffset = {
    top: 260,
    left: 260,
    right: 260,
    bottom: 290,
  };
  const centerAreaPadding = {
    top: 20,
    left: 20,
    right: 20,
    bottom: 20,
  };

  const svgSize = {
    width: window.innerWidth,
    height: window.innerHeight * 2,
  };

  const canvasSize = {
    width: svgSize.width - margin.left - margin.right,
    height: svgSize.height - margin.top - margin.bottom,
  };

  const centerAreaSize = {
    outer_width:
      svgSize.width -
      margin.left -
      margin.right -
      centerAreaOffset.left -
      centerAreaOffset.right,
    outer_height:
      svgSize.height -
      margin.top -
      margin.bottom -
      centerAreaOffset.top -
      centerAreaOffset.bottom,
    width:
      svgSize.width -
      margin.left -
      margin.right -
      centerAreaOffset.left -
      centerAreaOffset.right -
      centerAreaPadding.left -
      centerAreaPadding.right,
    height:
      svgSize.height -
      margin.top -
      margin.bottom -
      centerAreaOffset.top -
      centerAreaOffset.bottom -
      centerAreaPadding.top -
      centerAreaPadding.bottom,
  };

  const article_node_radius = 4.5;
  const entity_node_radius = 4;

</script>
<script lang="ts">
  const dispatch = createEventDispatcher();
  export let svgId;
  export let article_graph: any | undefined;
  export let entity_graph: any | undefined;
  export let filtered: boolean;
  export let searchedArticleIds: string[] | undefined;
  export let peripheral: any | undefined = undefined;
  export let articleClusterColorDict: any | undefined ;
  export let articleSubClusterColorDict: any | undefined;
  export let entityClusterColorDict: any;
  export let entitySubClusterColorDict : any| undefined;
  export let searchMode: boolean;
  export let showEntityClusterLabelDefault: boolean;
  export let showArticleClusterLabelDefault: boolean;
  export let gosper: any | undefined = undefined;

  let articleClusterBorderPoints: any = {};
  let clickedCluster: any = {};
  let clickedClusterLabel: string | undefined = undefined;
  let clickedEntityClusters: any[] = [];
  let hoveredEntityCluster: any | undefined = undefined;
  let highlightArticleIds: string[] | undefined = undefined;
  let highlight_entities: string[] | undefined = undefined;
  let pressedKey: string = "";

  // life cycles and event listeners
  onMount(() => {
    init()
  })
  // $: init()
  function init() {
    console.log("init hypermap")
    const svg = d3
      .select("#" + svgId)
      .attr("viewBox", `0 0 ${svgSize.width} ${svgSize.height}`)
      .attr("overflow", "visible");
    console.log(svg.node(), svgId)
    svg.select("g.margin").remove();
    const canvas = svg
      .append("g")
      .attr("class", "margin")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    canvas.append("g").attr("class", "entity-border-group");
    canvas.append("g").attr("class", "entity-node-group");
    canvas.append("g").attr("class", "entity-tag-group-parent");

    const center_area_svg = canvas
      .append("svg")
      .attr("class", "center-area-svg")
      .attr("width", centerAreaSize.outer_width)
      .attr("height", centerAreaSize.outer_height)
      .attr(
        "transform",
        "translate(" + centerAreaOffset.left + "," + centerAreaOffset.top + ")"
      )
      .lower();
    canvas.append("g").attr("class", "link-group");
    const center_area = center_area_svg
      .append("g")
      .datum({})
      .attr("class", "center-area")
      .attr(
        "transform",
        "translate(" +
          centerAreaPadding.left +
          "," +
          centerAreaPadding.top +
          ")"
      );

    center_area
      .append("rect")
      .attr("class", "center-area-background")
      .attr("x", -centerAreaPadding.left + 4)
      .attr("y", -centerAreaPadding.right + 4)
      // .attr("width", centerAreaSize.width)
      // .attr("height", centerAreaSize.height)
      .attr("width", centerAreaSize.outer_width - 8)
      .attr("height", centerAreaSize.outer_height - 8)
      .attr("stroke-width", "1px")
      .attr("stroke", "grey")
      .attr("rx", "5%")
      .attr("fill", "#e8e8e8")
      .attr("opacity", 0.2)
      .attr("filter", "url(#drop-shadow-border)")
      .attr("pointer-events", "none");

    center_area.append("g").attr("class", "article-border-group");
    center_area.append("g").attr("class", "article-node-group");
    // center_area.append("g").attr("class", "article-border-tag-group")
    center_area.append("path").attr("class", "highlight-border");
    // addBrush()
    // sfc.initPeripheral(peripheral);
    // sfc.initGosper(gosper);
    tags.init(svgId, centerAreaOffset, canvasSize);
    listenKeyBoard();
    listenZoom();
    listenClick();
    // await tick()
    console.log("init done")
    // setTooltipData(initialTooltipData)
  }

  $: sfc.initPeripheral(peripheral);
  $: sfc.initGosper(gosper);


  $: {
    if (highlightArticleIds === undefined) {
      if (!filtered) highlight_entities = undefined;
    } else {
      highlight_entities = entity_graph.entity_nodes
        .filter((entity_node) =>
          entity_node.mentions
            .map((mention) => mention.doc_id)
            .some((doc_id) => highlightArticleIds!.includes(doc_id))
        )
        .map((entity) => entity.id);
    }
  }

  $:  {
    if (!searchMode) {
      const svg = d3.select("#" + svgId);
      const centerArea = svg.select("g.margin").select("g.center-area");
      centerArea
        .selectAll("circle.article-node")
        .attr("opacity", (d: any) => (d.opacity = 0.5))
        .attr(
          "fill",
          (d: any) => (d.color = d.sub_cluster_color || d.cluster_color)
        );
      // centerArea.select("g.article-border-group").selectAll("path.concave-hull").attr("opacity", 0.5)
      svg
        .selectAll("circle.entity-node")
        .attr("opacity", (d: any) => (d.opacity = 0.5))
        .attr("fill", (d: any) => (d.color = d.cluster_color));
    }
  }

  $: entity_data_dict = ((nodes) => {
    if(!nodes) return undefined;
    let dict = {};
    nodes.forEach((node) => {
      dict[node.id] = node;
    });
    return dict;
  })(entity_graph?.entity_nodes);

  $: {
    if(searchedArticleIds !== undefined) {
      const svg = d3.select("#" + svgId);
      const centerArea = svg.select("g.margin").select("g.center-area");
      centerArea
        .select("g.article-node-group")
        .selectAll("circle.article-node")
        .attr("opacity", (d: any) => (d.opacity = 0.2))
        .attr("fill", (d: any) => (d.color = "grey"))
        .filter((d: any) => searchedArticleIds!.includes(d.id))
        .attr("opacity", (d: any) => (d.opacity = 1))
        .attr(
          "fill",
          (d: any) => (d.color = d.sub_cluster_color || d.cluster_color)
        );
      // entities
      const searchedEntities = entity_graph.entity_nodes
        .filter((entity_node) =>
          entity_node.mentions
            .map((mention) => mention.doc_id)
            .some((doc_id) => searchedArticleIds!.includes(doc_id))
        )
        .map((entity) => entity.id);
      svg
        .selectAll("circle.entity-node")
        .attr("opacity", (d: any) => (d.opacity = 0.2))
        .attr("fill", (d: any) => (d.color = "grey"))
        .filter((d: any) => searchedEntities.includes(d.id))
        .attr("opacity", (d: any) => (d.opacity = 1))
        .attr("fill", (d: any) => (d.color = d.cluster_color));
      if (highlightArticleIds) {
        const intersectedArticleIds = searchedArticleIds!.filter((id) =>
          highlightArticleIds?.includes(id)
        );
        highlightArticleIds = intersectedArticleIds;
      } else {
        highlightArticleIds = searchedArticleIds;
      }
    }
  }

  $: update_highlight_articles(highlightArticleIds);
  $: update_highlight_entities(highlight_entities);
  function update_highlight_articles(...args) {
    const [highlightArticleIds] = args;
    const svg = d3.select("#" + svgId);
    const centerArea = svg.select("g.margin").select("g.center-area");
    const article_node_group = centerArea.select("g.article-node-group");
    if (highlightArticleIds === undefined) {
      article_node_group
        .selectAll("circle.article-node")
        .attr("opacity", (d: any) => d.opacity);
    } else {
      article_node_group
        .selectAll("circle.article-node")
        .attr("opacity", 0.2)
        .filter((node: any) => highlightArticleIds.includes(node.id))
        .attr("opacity", (d: any) => (d.color === "grey" ? 0.2 : 1));
    }
  }
  function update_highlight_entities(...args) {
    const [highlight_entities] = args;
    const svg = d3.select("#" + svgId);
    const entity_node_group = svg.select("g.entity-node-group");
    // entity
    if (highlightArticleIds === undefined) {
      entity_node_group
        .selectAll("circle.entity-node")
        .attr("opacity", (d: any) => d.opacity);
    } else {
      entity_node_group
        .selectAll("circle.entity-node")
        .attr("stroke-width", 1)
        .attr("opacity", 0.2)
        .filter((node: any) => highlight_entities?.includes(node.id) || false)
        .attr("opacity", (d: any) => (d.color === "grey" ? 0.2 : 1));
    }
  }
  $: zoom.setProps(undefined, undefined, undefined, articleClusterBorderPoints);
  $: {
    if(article_graph) update_article_cluster(article_graph);
  }
  $: { 
    if(entity_graph) update_entity_cluster(entity_graph);
  }

  function update_article_cluster(article_graph) {
    console.log("update article cluster")
    const centerArea = d3
      .select("#" + svgId)
      .select("g.margin")
      .select("g.center-area");
    // coords
    sfc.generate_gosper_coord(article_graph.article_nodes, centerAreaSize);

    // articles nodes
    const t_delay = 100;
    const t_duration = 1500;
    const article_node_group = centerArea.select("g.article-node-group");
    article_node_group
      .selectAll("circle.article-node")
      .data(article_graph.article_nodes, (d: any, i) => {
        d.i = i;
        return d.id;
      })
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("id", (d: any) => d.title)
            .attr("class", "article-node")
            .attr("r", article_node_radius)
            .attr("stroke", "white")
            .attr("stroke-width", 0.5)
            .attr("fill", (d: any) => {
              d.cluster_color = articleClusterColorDict[d.cluster_label];
              d.color = d.cluster_color;
              return d.color;
            })
            .attr("pointer-events", "none")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("opacity", 0)
            .attr("cx", (d: any) => d.x)
            .attr("cy", (d: any) => d.y)
            .attr("opacity", (d: any) => (d.opacity = 0.5))
            .attr("transform", "translate(0,0)")
            .selection(),
        (update) =>
          update
            .attr("fill", (d: any) => {
              d.cluster_color = articleClusterColorDict[d.cluster_label];
              d.color = d.cluster_color;
              return d.color;
            })
            .attr("opacity", (d: any) => (d.opacity = 0.5))
            .transition()
            .delay((d) => {
              if (article_graph.filtered) {
                return t_duration;
              } else {
                return (d.update_cluster_order || 0) * t_delay;
              }
            })
            .duration(t_duration)
            .attr("cx", (d: any) => d.x)
            .attr("cy", (d: any) => d.y)
      );

    // cluster borders
    const cluster_borders = generate_cluster_borders(
      article_graph.article_nodes,
      article_graph.clusters,
      article_graph.cluster_order,
      article_graph.update_cluster_order,
      1.5, // concavity
      "rounded", // smoothing
      "gosper"
    );

    let tmp_dict = {};
    cluster_borders.forEach((border) => {
      tmp_dict[border.cluster_label] = border.points;
    });
    articleClusterBorderPoints = tmp_dict;
    // setArticleClusterBorderPoints(tmp_dict)

    // cluster label
    tags.addArticleClusterLabel(
      cluster_borders,
      article_graph,
      articleClusterColorDict,
      showArticleClusterLabelDefault,
      article_event_handlers.tags.click
    );

    // border paths
    const border_group = centerArea.select("g.article-border-group");
    border_group
      .selectAll("path.concave-hull")
      .data(cluster_borders, (d: any) => d.cluster_label)
      .join(
        (enter) =>
          enter
            .append("path")
            .attr("class", "concave-hull")
            .attr("d", (d) => d.path)
            .attr("fill", "#e1e1e1")
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("cursor", "pointer")
            .attr("filter", "url(#drop-shadow-border)")
            .attr("transform", "translate(0,0)")
            .on("mouseover", article_event_handlers.mouseover)
            .on("mouseout", article_event_handlers.mouseout)
            // .call(bindDrag)
            .on("click", article_event_handlers.click)
            .attr("opacity", (d: any) => {
              d.opacity = 0.5;
              return 0;
            })
            .transition()
            .delay(t_delay + (article_graph.filtered ? t_duration : 0))
            .duration(t_duration)
            .attr("opacity", 0.5)
            .selection(),
        (update) =>
          update
            .on("mouseover", article_event_handlers.mouseover)
            .on("mouseout", article_event_handlers.mouseout)
            // .call(bindDrag)
            .on("click", article_event_handlers.click)
            .transition()
            .delay(t_delay + (article_graph.filtered ? t_duration : 0))
            .duration(t_duration)
            .attr("d", (d) => d.path)
            .duration(t_duration)
            .attr("opacity", (d: any) => (d.opacity = 0.5)),
        (exit) =>
          exit
            .transition()
            .delay(article_graph.filtered ? t_duration : 0)
            .remove()
      );
  }

  function update_entity_cluster(entity_graph) {
    const canvas = d3.select("#" + svgId).select("g.margin");
    sfc.generate_entity_hilbert_coord(entity_graph.entity_nodes, canvasSize);
    const t_delay = 100;
    const t_duration = 1500;
    // entities
    const entity_node_group = canvas.select("g.entity-node-group");
    entity_node_group
      .selectAll("circle.entity-node")
      .data(entity_graph.entity_nodes, (d: any, i) => {
        d.i = i;
        return d.id;
      })
      .join(
        (enter) =>
          enter
            .append("circle")
            .attr("id", (d: any) => d.title)
            .attr("class", "entity-node")
            .attr("r", entity_node_radius)
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr(
              "fill",
              (d: any) =>
                (d.cluster_color = entityClusterColorDict[d.cluster_label])
            )
            .attr("pointer-events", "none")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("opacity", 0)
            .attr("cx", (d: any) => d.x)
            .attr("cy", (d: any) => d.y)
            .attr("opacity", (d: any) => {
              return (d.opacity = 0.5);
            })
            .selection(),
        (update) =>
          update
            .transition()
            .delay((d) => {
              if (entity_graph.filtered) {
                return t_duration;
              } else {
                return (d.update_cluster_order || 0) * t_delay;
              }
            })
            .duration(t_duration)
            .attr(
              "fill",
              (d: any) =>
                (d.cluster_color = entityClusterColorDict[d.cluster_label])
            )
            .attr("opacity", (d: any) => (d.opacity = 0.5))
            .attr("cx", (d: any) => d.x)
            .attr("cy", (d: any) => d.y)
      );
    // cluster borders
    const cluster_borders = generate_cluster_borders(
      entity_graph.entity_nodes,
      entity_graph.entity_clusters,
      entity_graph.entity_cluster_order,
      entity_graph.entity_update_cluster_order,
      0.2, // concavity
      "sketch", // smoothing
      "hilbert"
    );

    // cluster label
    tags.addEntityClusterLabel(
      cluster_borders,
      entity_graph.entity_hierarchical_topics,
      entityClusterColorDict,
      showEntityClusterLabelDefault
    );
    canvas
      .select("g.entity-border-group")
      .selectAll("path.concave-hull")
      .data(cluster_borders, (d: any) => d.cluster_label)
      .join(
        (enter) =>
          enter
            .append("path")
            .attr("class", "concave-hull")
            .attr("d", (d) => d.path)
            .attr("fill", "#e1e1e1")
            .attr("stroke", "black")
            .attr("stroke-width", 1)
            .attr("cursor", "pointer")
            .attr("filter", "url(#drop-shadow-border)")
            .on("mouseover", entity_border_handlers.mouseover)
            .on("mouseout", entity_border_handlers.mouseout)
            .on("click", entity_border_handlers.click)
            .attr("opacity", 0)
            .transition()
            .delay(t_delay + (entity_graph.filtered ? t_duration : 0))
            .duration(t_duration)
            .attr("opacity", 0.5)
            .selection(),
        (update) =>
          update
            .on("mouseover", entity_border_handlers.mouseover)
            .on("mouseout", entity_border_handlers.mouseout)
            .on("click", entity_border_handlers.click)
            .transition()
            .delay(t_delay + (article_graph.filtered ? t_duration : 0))
            .duration(t_duration)
            .attr("d", (d) => d.path)
            .attr("opacity", 0.5),
        (exit) =>
          exit
            .transition()
            .delay(entity_graph.filtered ? t_duration : 0)
            .remove()
      );
    return;
  }

  const article_event_handlers = {
    mouseover: function (_, d) {
      d3.select(this)
        .attr("stroke-width", 4)
        .attr("stroke", articleClusterColorDict[d.cluster_label])
        .attr("opacity", 1)
        .attr("filter", "url(#drop-shadow-border)");
      // d3.selectAll("rect.cluster-label-border")
      //   .filter((rect_data: any) => d.cluster_label === rect_data.cluster_label)
      //   .attr("stroke-width", 10)
      //   .attr("opacity", 1)
      d3.selectAll("g.article-border-tag-group")
        .filter((tag_data: any) => d.cluster_label === tag_data.cluster_label)
        .attr("opacity", 1)
        .attr("pointer-events", "auto");
    },

    mouseout: function () {
      // if(clickedClusters.includes(d.cluster_label)) return
      d3.select(this)
        .attr("stroke-width", 1)
        .attr("stroke", "black")
        .attr("opacity", 0.5);
      // .attr("filter", "none")
      // d3.selectAll("rect.cluster-label-border")
      //   .attr("stroke-width", 3)
      //   .attr("opacity", 0.5)
      d3.selectAll("g.article-border-tag-group")
        .attr("opacity", showArticleClusterLabelDefault ? 1 : 0)
        .attr(
          "pointer-events",
          showArticleClusterLabelDefault ? "auto" : "none"
        )
        .filter(
          (tag_data: any) => clickedCluster === tag_data.cluster_label || false
        )
        .attr("opacity", 1)
        .attr("pointer-events", "auto");

      d3.select("line.cluster-label-border-connector").attr(
        "opacity",
        showArticleClusterLabelDefault ? 1 : 0
      );
    },

    click: function (e, d) {
      console.log("article clicked")
      e.stopPropagation();
      const centerArea = d3
        .select("#" + svgId)
        .select("g.margin")
        .select("g.center-area");
      if (!e.defaultPrevented) {
        // remove sub cluster labels
        if (e.ctrlKey || e.metaKey) {
          // reset highlight
          if (clickedCluster !== undefined) {
            if (clickedCluster === d.cluster_label) {
              clickedCluster = undefined;
              //   setClickedCluster(undefined)
              tags.removeSubClusterLabels();
              centerArea.select("line.cluster-label-border-connector").remove();
              centerArea
                .selectAll("g.article-border-tag-group")
                .select("g.cluster-label-group")
                .filter(
                  (filter_data: any) =>
                    clickedCluster === filter_data.cluster_label
                )
                .remove();
            }
          }
          //   onArticleClusterClicked(e, d.cluster_label)
          dispatch("article-cluster-clicked", d.cluster_label);
          //   setClickedCluster(undefined)
          clickedCluster = undefined;
          //   if(clickedClusterLabel.current === d.cluster_label) clickedClusterLabel.current = undefined
          if (clickedClusterLabel === d.cluster_label)
            clickedClusterLabel = undefined;
        } else if (pressedKey === "68") {
          // remove border
          d3.select(this).remove();
          // remove tag
          d3.selectAll("g.article-border-tag-group")
            .filter(
              (tag_data: any) => d.cluster_label === tag_data.cluster_label
            )
            .remove();
          // remove nodes
          d3.selectAll("circle.article-node")
            .filter((node: any) => node.cluster_label === d.cluster_label)
            .remove();
          d3.select("line.cluster-label-border-connector").remove();
          //   onArticleClusterRemoved(d.cluster_label)
          dispatch("article-cluster-removed", d.cluster_label);
        } else {
          hideSubClusterStructure();
          // if clicking on a highlighted cluster, un-highlight it
          if (clickedCluster && clickedCluster === d.cluster_label) {
            d.lifted = false;
            // setClickedCluster(undefined)
            clickedCluster = undefined;
            // if(!searchMode) setHighlightArticleIds(undefined)
            // else setHighlightArticleIds(findIntersection(searchedArticleIds, undefined))
            if (!searchMode) highlightArticleIds = undefined;
            else
              highlightArticleIds = findIntersection(
                searchedArticleIds,
                undefined
              );
            // clickedClusterLabel.current = undefined
            clickedClusterLabel = undefined;
          } else {
            // highlight clicked cluster
            d3.select(this.parentNode)
              .selectAll("path.concave-hull")
              .each((d: any) => (d.lifted = false));
            d.lifted = true;
            // setClickedCluster(d.cluster_label)
            clickedClusterLabel = d.cluster_label;
            showSubClusterStructure(d);
            // if(!searchMode) setHighlightArticleIds(article_graph.clusters[d.cluster_label] )
            // else setHighlightArticleIds(findIntersection(searchedArticleIds, article_graph.clusters[d.cluster_label] ))
            if (!searchMode)
              highlightArticleIds = article_graph.clusters[d.cluster_label];
            else
              highlightArticleIds = findIntersection(
                searchedArticleIds,
                article_graph.clusters[d.cluster_label]
              );
            // clickedClusterLabel.current = d.cluster_label
            clickedClusterLabel = d.cluster_label;
          }
        }
      }
    },
    tags: {
      click: function (e, d) {
        e.stopPropagation();
        if (pressedKey === "68") {
          if (article_graph.clusters[d.cluster_label]) {
            // remove cluster
            const svg = d3.select("#" + svgId);
            const centerArea = svg.select("g.margin").select("g.center-area");
            // remove border
            centerArea
              .selectAll("path.concave-hull")
              .filter(
                (border_data: any) =>
                  border_data.cluster_label === d.cluster_label
              )
              .remove();
            // remove tag
            d3.selectAll("g.article-border-tag-group")
              .filter(
                (tag_data: any) => d.cluster_label === tag_data.cluster_label
              )
              .remove();
            // remove nodes
            d3.selectAll("circle.article-node")
              .filter((node: any) => node.cluster_label === d.cluster_label)
              .remove();
            d3.select("line.cluster-label-border-connector").remove();
            // onArticleClusterRemoved(d.cluster_label)
            dispatch("article-cluster-removed", d.cluster_label);
          } else {
            // remove sub cluster
            // onArticleClusterRemoved(d.cluster_label)
          }
        } else {
          //   if(!searchMode) setHighlightArticleIds(article_graph.clusters[d.cluster_label] || article_graph.sub_clusters[d.cluster_label])
          //   else setHighlightArticleIds(findIntersection(searchedArticleIds, article_graph.clusters[d.cluster_label] || article_graph.sub_clusters[d.cluster_label]))
          if (!searchMode)
            highlightArticleIds =
              article_graph.clusters[d.cluster_label] ||
              article_graph.sub_clusters[d.cluster_label];
          else
            highlightArticleIds = findIntersection(
              searchedArticleIds,
              article_graph.clusters[d.cluster_label] ||
                article_graph.sub_clusters[d.cluster_label]
            );
          //   clickedClusterLabel.current = d.cluster_label;
          clickedClusterLabel = d.cluster_label;
          // onArticleLabelClicked(d.cluster_label)
          dispatch("article-label-clicked", d.cluster_label);
        }
      },
    },
  };
  const entity_border_handlers = {
    mouseover: function (_, d) {
      // const canvas = d3.select('#' + svgId).select("g.margin")
      // add highlighted entities
      // highlight border
      const hovered_entity_tag = d3
        .selectAll("g.entity-tag-group")
        .filter((tag_data: any) => tag_data.cluster_label === d.cluster_label);
      addHighlightedEntityLabel(d);
      d3.select(this)
        .attr("stroke-width", 2)
        .attr("stroke", entityClusterColorDict[d.cluster_label])
        .attr("opacity", 1);
      d3.select(this.parentNode.parentNode)
        .select("rect.entity-cluster-label-border")
        .attr("stroke-width", 5)
        .attr("opacity", 0.5)
        .attr("filter", "url(#drop-shadow-border)");
      // show entity cluster label
      hovered_entity_tag.attr("opacity", 1).attr("pointer-events", "auto");
      const clusterClicked = clickedEntityClusters.includes(d.cluster_label);
      if (clusterClicked) {
        d3.select(this)
          .attr("stroke-width", 4)
          .attr("stroke", entityClusterColorDict[d.cluster_label])
          .attr("opacity", 1);

        hovered_entity_tag
          .select("rect.entity-cluster-label-border")
          .attr("stroke-width", 10)
          .attr("opacity", 1)
          .attr("filter", "url(#drop-shadow-border)");

        hovered_entity_tag
          .select("rect.highlighted-entity-label-border")
          .attr("stroke-width", 10)
          .attr("opacity", 1)
          .attr("filter", "url(#drop-shadow-border)");
      }
      hoveredEntityCluster = d;
    },
    mouseout: function (_, d) {
      const hovered_entity_tag = d3
        .selectAll("g.entity-tag-group")
        .filter((tag_data: any) => tag_data.cluster_label === d.cluster_label);
      const clusterClicked = clickedEntityClusters.includes(d.cluster_label);
      if (!clusterClicked) {
        // border
        d3.select(this)
          .attr("stroke-width", 1)
          .attr("stroke", "black")
          .attr("opacity", 0.5);
        // tags
        hovered_entity_tag
          .attr("opacity", showEntityClusterLabelDefault ? 1 : 0)
          .attr(
            "pointer-events",
            showEntityClusterLabelDefault ? "auto" : "none"
          );
        // .attr("transform", `translate(${0},${0})`)
        hovered_entity_tag
          .select("rect.entity-cluster-label-border")
          .attr("stroke-width", 3)
          .attr("opacity", 0.5)
          .attr("filter", "none");
      }
    },
    click: function (e, d) {
      e.stopPropagation();
      if (!e.defaultPrevented) {
        if (e.ctrlKey || e.metaKey) {
          // expansion
          //   onEntityClusterClicked(e, d.cluster_label)
          dispatch("entity-cluster-clicked", d.cluster_label);
        } else if (pressedKey === "68") {
          // deletion
          d3.select(this).remove();
          // remove tag
          d3.selectAll("g.entity-tag-group")
            .filter(
              (tag_data: any) => d.cluster_label === tag_data.cluster_label
            )
            .remove();
          // remove nodes
          d3.selectAll("circle.entity-node")
            .filter((node: any) => node.cluster_label === d.cluster_label)
            .remove();
          //   onEntityClusterRemoved(d.cluster_label)
          dispatch("entity-cluster-removed", d.cluster_label);
        } else {
          // normal click
          const hovered_entity_tag = d3
            .selectAll("g.entity-tag-group")
            .filter(
              (tag_data: any) => tag_data.cluster_label === d.cluster_label
            );
          if (clickedEntityClusters.includes(d.cluster_label)) {
            // un-click
            clickedEntityClusters.splice(
              clickedEntityClusters.indexOf(d.cluster_label),
              1
            );
            d3.select(this)
              .attr("stroke-width", 2)
              .attr("stroke", entityClusterColorDict[d.cluster_label])
              .attr("opacity", 1);
            hovered_entity_tag
              .select("rect.entity-cluster-label-border")
              .attr("stroke-width", 5)
              .attr("opacity", 0.5)
              .attr("filter", "url(#drop-shadow-border)");
            hovered_entity_tag
              .attr("opacity", 1)
              .attr("pointer-events", "auto");
            hovered_entity_tag
              .select("rect.highlighted-entity-label-border")
              .attr("stroke-width", 5)
              .attr("opacity", 0.5)
              .attr("filter", "url(#drop-shadow-border)");
          } else {
            // click
            clickedEntityClusters.push(d.cluster_label);
            d3.select(this)
              .attr("stroke-width", 4)
              .attr("stroke", entityClusterColorDict[d.cluster_label])
              .attr("opacity", 1);

            hovered_entity_tag
              .select("rect.entity-cluster-label-border")
              .attr("stroke-width", 10)
              .attr("opacity", 1)
              .attr("filter", "url(#drop-shadow-border)");

            hovered_entity_tag
              .select("rect.highlighted-entity-label-border")
              .attr("stroke-width", 10)
              .attr("opacity", 1)
              .attr("filter", "url(#drop-shadow-border)");
          }
        }
      }
    },
  };

  function showSubClusterStructure(d) {
    const centerArea = d3
      .select("#" + svgId)
      .select("g.margin")
      .select("g.center-area");
    // update sub-cluster labels
    tags.updateArticleSubClusterLabels(
      articleClusterBorderPoints[d.cluster_label],
      article_graph,
      d.cluster_label,
      article_graph.cluster_children[d.cluster_label],
      articleSubClusterColorDict,
      1.5,
      article_event_handlers.tags.click,
      bindDrag
    );
    tags.liftArticleClusterLabel(
      d,
      article_graph,
      article_event_handlers.tags.click
    );

    // update border color
    d3.select(this)
      .attr("stroke-width", 4)
      .attr("stroke", articleClusterColorDict[d.cluster_label])
      .attr("opacity", 1)
      .attr("filter", "url(#drop-shadow-border)");

    // show connected entities
    // show_connected_entities(d.cluster_label)
    // highlight nodes
    centerArea
      .selectAll("circle.article-node")
      .attr("opacity", 0.5)
      .filter((node: any) => node.cluster_label === d.cluster_label)
      .attr("fill", (d: any) => {
        d.sub_cluster_color = articleSubClusterColorDict[d.sub_cluster_label];
        return d.sub_cluster_color;
      })
      .attr("opacity", 1);
  }

  function hideSubClusterStructure() {
    const centerArea = d3
      .select("#" + svgId)
      .select("g.margin")
      .select("g.center-area");

    // remove sub-cluster labels
    tags.removeSubClusterLabels();
    tags.restoreLiftedArticleClusterLabel();

    // reset hovered cluster color
    centerArea
      .selectAll("circle.article-node")
      .attr("fill", (d: any) => {
        d.sub_cluster_color = undefined;
        return d.color;
      })
      .attr("opacity", (d: any) => {
        return d.opacity;
      });
  }

  function addHighlightedEntityLabel(d) {
    if (highlight_entities === undefined) {
      // remove highlight
      const canvas = d3.select("#" + tags.svgId).select("g.margin");
      const hovered_entity_tag = canvas.selectAll("g.entity-tag-group");
      const group = hovered_entity_tag
        .select("g.entity-cluster-label-group")
        .filter(
          (rect_data: any) => d.cluster_label === rect_data.cluster_label
        );
      group.select("text.highlighted-entity-label").remove();
      group.select("rect.highlighted-entity-label-border").remove();
      return;
    }
    const hovered_cluster_entity_ids =
      entity_graph.entity_clusters[d.cluster_label];
    const cluster_highlighted_entity_ids = hovered_cluster_entity_ids.filter(
      (id) => highlight_entities!.includes(id)
    );
    if (cluster_highlighted_entity_ids.length == 0) {
      // remove highlight labels
      const canvas = d3.select("#" + tags.svgId).select("g.margin");
      const hovered_entity_tag = canvas.selectAll("g.entity-tag-group");
      const group = hovered_entity_tag
        .select("g.entity-cluster-label-group")
        .filter(
          (rect_data: any) => d.cluster_label === rect_data.cluster_label
        );
      group.select("text.highlighted-entity-label").remove();
      group.select("rect.highlighted-entity-label-border").remove();
      return;
    }
    const cluster_highlighted_entity_id_titles =
      cluster_highlighted_entity_ids.map((id) => [
        id,
        entity_data_dict?.[id].title,
      ]);
    tags.addHighlightedEntityLabel(
      d.cluster_label,
      cluster_highlighted_entity_id_titles,
      entityClusterColorDict,
      (clickedEntityLabels) => {
        const cluster_articles =
          article_graph.clusters[clickedClusterLabel!] ||
          article_graph.sub_clusters[clickedClusterLabel!] ||
          highlightArticleIds;
        if (clickedEntityLabels.length === 0) {
        //   onEntityLabelClicked(
        //     undefined,
        //     cluster_articles,
        //     clickedClusterLabel
        //   );
            dispatch('entity-label-clicked', {
                entity_titles: undefined,
                doc_ids: cluster_articles,
                cluster_label: clickedClusterLabel
            })
        } else {
          const clicked_entity_ids = clickedEntityLabels.map(
            (entity_label) => entity_label[0]
          );
          const clicked_entity_titles = clickedEntityLabels.map(
            (entity_label) => entity_label[1]
          );
          const clicked_entity_mention_doc_ids = clicked_entity_ids
            .map((entity_id) => entity_data_dict?.[entity_id].mentions)
            .map((mentions) => mentions.map((mention) => mention.doc_id))
            .flat();
          const mentions_in_cluster = clicked_entity_mention_doc_ids.filter(
            (doc_id) => cluster_articles.includes(doc_id)
          );
        //   onEntityLabelClicked(
        //     clicked_entity_titles,
        //     mentions_in_cluster,
        //     clickedClusterLabel
        //   );
            dispatch('entity-label-clicked', {
                entity_titles: clicked_entity_titles,
                doc_ids: mentions_in_cluster,
                cluster_label: clickedClusterLabel
            })
        }
      }
    );
  }

  function generate_cluster_borders(
    nodes,
    clusters,
    cluster_order,
    update_cluster_order,
    concavity = 0.2,
    smoothing = "rounded",
    curve_type
  ) {
    let border_paths: any[] = [];
    Object.keys(clusters).forEach((cluster_label) => {
      const cluster_node_ids = clusters[cluster_label];
      const nodes_data = nodes.filter((node) =>
        cluster_node_ids.includes(node.id)
      );
      // if(nodes_data.length === 0) return

      const { polygon, path, centroid, min_x, max_x, min_y, max_y } =
        borders.generate_border(nodes_data, concavity, smoothing, curve_type);
      border_paths.push({
        cluster_label: cluster_label,
        cluster_order: cluster_order.indexOf(cluster_label),
        update_cluster_order: update_cluster_order[cluster_label],
        points: polygon,
        path: path,
        min_x: min_x,
        max_x: max_x,
        min_y: min_y,
        max_y: max_y,
        centroid: centroid,
      });
    });
    return border_paths;
  }

  // functions
  function findIntersection(
    arr1: string[] | undefined,
    arr2: string[] | undefined
  ) {
    if (!arr1) return arr2;
    if (!arr2) return arr1;
    return arr1.filter((id) => arr2.includes(id));
  }

  function listenClick() {
    d3.select("#" + svgId).on("click", function () {
      if (!clickedCluster && clickedClusterLabel) {
        // removeHighlightCluster()
        clickedClusterLabel = undefined;
        if (!searchMode) highlightArticleIds = undefined;
        else
          highlightArticleIds = findIntersection(searchedArticleIds, undefined);
      }
    });
  }

  function listenZoom() {
    zoom.resetZoom();
    zoom.setProps(
      svgId,
      articleClusterBorderPoints,
      article_graph,
      articleSubClusterColorDict,
      margin,
      centerAreaOffset,
      centerAreaSize
    );
    d3.select("#" + svgId)
      // .select("svg.center-area-svg")
      .call(zoom);
  }

  function listenKeyBoard() {
    d3.select("body").on("keydown", (e) => (pressedKey = "" + e.keyCode));
    d3.select("body").on("keyup", () => (pressedKey = ""));
  }

  function bindDrag(elements) {
    const drag: any = d3.drag()
        .clickDistance(100)
        .on("start", DragUtils.dragStarted)
        .on("drag", DragUtils.dragged)
        .on("end", DragUtils.dragEnded);
    d3.selectAll(elements).call(drag)
  }

</script>

<div
  class="event-cluster-container flex flex-col items-stretch h-full flex-auto"
>
  <div class="svg-container flex justify-center h-full">
    <svg id={svgId} class="event-cluster-svg h-full z-10">
      <defs>
        <filter
          id="drop-shadow-border"
          x="-10%"
          y="-10%"
          width="120%"
          height="120%"
        >
          <feOffset result="offOut" in="SourceAlpha" dx="0" dy="0" />
          <feGaussianBlur result="blurOut" in="offOut" stdDeviation="3" />
          <feBlend
            in="SourceGraphic"
            in2="blurOut"
            mode="normal"
            floodColor="rgba(0, 0, 0, 0.8)"
          />
        </filter>
      </defs>
    </svg>
  </div>
</div>
