import { t_ArticleNode, t_EntityNode } from "./Node";
import { t_Link } from "./Link";
export type d_ArticleGraph = {
    // articles
    article_nodes: t_ArticleNode[],
    clusters: any,
    sub_clusters: any,
    cluster_order: any,
    hierarchical_topics: any,
    update_cluster_order: any,
    article_cluster_linked_entities: any,
    filtered? : boolean,
}
export type d_EntityGraph = {
    // entities
    entity_nodes: t_EntityNode[],
    entity_clusters: any[],
    entity_sub_clusters: any[],
    entity_cluster_order: any,
    entity_update_cluster_order: any,
    links: t_Link[],
    filtered? : boolean,
}
export type t_EventHGraph = {
    article_graph: d_ArticleGraph,
    entity_graph: d_EntityGraph
}