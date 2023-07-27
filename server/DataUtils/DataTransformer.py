class DataTransformer:
    def __init__(self) -> None:
        return
    
    def transform_hyperedge(self, hyperedges):
        return list(map(
            lambda hyperedge: {
                'id': hyperedge['id'],
                'type': hyperedge['type'],
                'cluster_label': hyperedge['cluster_label'],
                'sub_cluster_label': hyperedge['sub_cluster_label'],
                'date': hyperedge['date'],
                'doc_id': hyperedge['doc_id'],
                # 'leaf_label': hyperedge['leaf_label'],
                'order': hyperedge['order'],
                'cluster_order': hyperedge['cluster_order'],
                'update_cluster_order': hyperedge['update_cluster_order'],
            }, hyperedges))