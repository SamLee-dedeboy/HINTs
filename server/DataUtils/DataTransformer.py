class DataTransformer:
    def __init__(self) -> None:
        return
    
    def transform_hyperedge(self, hyperedges):
        return list(map(
            lambda hyperedge: {
                'id': hyperedge['id'],
                'type': hyperedge['type'],
                'cluster_label': hyperedge['cluster_label'],
                'date': hyperedge['date'],
                'doc_id': hyperedge['doc_id'],
                'leaf_label': hyperedge['leaf_label'],
            }, hyperedges))