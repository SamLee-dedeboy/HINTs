export type d_SFCNode = {
    // order: number,
    cluster_order: number,
    update_cluster_order: number,
    cluster_label: string,
    sub_cluster_label: string,
    sfc_order: number
}

export type d_ArticleNode = {
    id: string,
    type: string,
    doc_id: string,
    date: string,
    summary?: string,
    content?: string,
    trigger?: string,
    arguments?: string[],
}

export type d_EntityNode = {
    id: string,
    title: string,
    entity_type: string,
    type: string,
    mentions: any[],
}

// visual encodings 
export type v_Node = {
    cluster_color? :string,
    sub_cluster_color? :string,
    x? : number,
    y? : number,
    cell_width?: number,
    cell_height?: number,

}

export type t_ArticleNode = d_ArticleNode & v_Node & d_SFCNode
export type t_EntityNode = d_EntityNode & v_Node & d_SFCNode
