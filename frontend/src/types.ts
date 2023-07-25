export type t_EventHGraph = {
    hyperedge_nodes: t_HyperedgeNode[],
    entity_nodes: t_EntityNode[],
    candidate_entity_nodes: t_EntityNode[]
    links: t_link[],
    clusters: any
}

export type t_Cluster = {
    id: string,
    hyperedge_nodes: string[]
    entity_nodes: string[]
    candidate_entity_nodes: string[]
    connected_clusters: t_ConnectedCluster[]
    links: t_link[],
}

export type t_ConnectedCluster = {
    id: string,
    volume: number
}

export type t_HyperedgeNode = {
    id: string,
    type: string,
    trigger: string,
    arguments: string[],
    doc_id: string,
    summary: string,
    content: string,
    date: string,
    cluster_label? :string,
    cluster_color? :string,
    x? : number,
    y? : number,
}

export type t_EntityNode = {
    id: string,
    title: string,
    entity_type: string,
    type: string,
    mentions: any[],
}

export type t_link = {
    source: string,
    target: string,
}