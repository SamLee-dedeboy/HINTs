import { t_ArticleNode, t_EntityNode } from "./Node";
import { t_Link } from "./Link";
export type d_ArticleGraph = {
    // articles
    article_nodes: t_ArticleNode[],
    clusters: { [cluster_label: string]: string[] },
    cluster_children: { [cluster_label: string]: string[]},
    sub_clusters: { [sub_cluster_label: string]: string[] },
    cluster_order: string[],
    hierarchical_topics: { [topic_label: string]: string },
    update_cluster_order: { [cluster_label: string]: number },
    // article_cluster_links: any,
    cluster_entity_inner_links: { [cluster_label: string]: [string, string][] },
    filtered? : boolean,
}
export type d_EntityGraph = {
    // entities
    entity_nodes: t_EntityNode[],
    entity_clusters: { [cluster_label: string]: string[] },
    entity_cluster_children: { [cluster_label: string]: string[]},
    entity_sub_clusters: { [sub_cluster_label: string]: string[] },
    entity_cluster_order: string[],
    entity_update_cluster_order: string[],
    entity_hierarchical_topics: { [topic_label: string]: string },
    links: t_Link[],
    filtered? : boolean,
}
export type t_EventHGraph = {
    article_graph: d_ArticleGraph,
    entity_graph: d_EntityGraph,
    user_hgraph: {
        article_nodes: string[],
        entity_nodes: string[]
        filtered: boolean,
        links: { source: string, target: string }[],
    },
}