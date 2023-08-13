import { d_ArticleNode, d_EntityNode } from "./Node";
import { d_Link } from "./Link";

export type d_Cluster = {
    id: string,
    article_nodes: d_ArticleNode[]
    links: d_Link[],
    candidate_entity_nodes: string[]
    argument_nodes? : d_EntityNode[]
    entity_nodes? : string[]
    connected_clusters?: t_ConnectedCluster[]
}

export type v_Cluster = {
    cluster_color?: string,
    sub_cluster_color?: string,
}

export type t_Cluster = d_Cluster & v_Cluster

export type t_ConnectedCluster = {
    id: string,
    volume: number
}
