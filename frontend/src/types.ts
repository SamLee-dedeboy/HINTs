export type t_EventHGraph = {
    hyperedge_nodes: t_HyperedgeNode[],
    entity_nodes: t_EntityNode[],
    links: t_link[],
    partition: {},
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