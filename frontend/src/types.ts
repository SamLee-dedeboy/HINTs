export type t_EventHGraph = {
    // articles
    hyperedge_nodes: t_HyperedgeNode[],
    clusters: any,
    sub_clusters: any,
    cluster_order: any,
    hierarchical_topics: any,
    links: t_link[],
    candidate_entity_nodes?: t_EntityNode[]
    argument_nodes?: t_EntityNode[],
    update_cluster_order: any,
    article_cluster_entities: any,
    // entities
    entity_nodes: t_EntityNode[],
    entity_clusters: any[],
    entity_cluster_order: any,
    entity_update_cluster_order: any,
}

export type t_Cluster = {
    id: string,
    hyperedge_nodes: t_HyperedgeNode[]
    links: t_link[],
    candidate_entity_nodes: string[]
    argument_nodes? : t_EntityNode[]
    entity_nodes? : string[]
    connected_clusters?: t_ConnectedCluster[]
    cluster_color?: string,
    sub_cluster_color?: string,
}

export type t_ConnectedCluster = {
    id: string,
    volume: number
}

export type t_HyperedgeNode = {
    id: string,
    type: string,
    doc_id: string,
    date: string,
    order: number,
    cluster_order: number,
    update_cluster_order: number,
    cluster_label: string,
    sub_cluster_label: string,
    // optional
    // radius?: number,
    trigger?: string,
    arguments?: string[],
    summary?: string,
    content?: string,
    cluster_color? :string,
    sub_cluster_color? :string,
    x? : number,
    y? : number,
}

export type t_EntityNode = {
    id: string,
    title: string,
    entity_type: string,
    type: string,
    mentions: any[],
    update_cluster_order: number,
    cluster_label: string,
}

export type t_link = {
    source: string,
    target: string,
}

export type tooltipContent = {
    cluster_label: string,
    cluster_topic: string,
    sub_clusters: tooltipContent[]
}

export type t_StorylineData = {
    storyline: t_Storyline,
    links: t_link[],
    entity_data: any,
    article_data: any,
}

export type t_Storyline = any