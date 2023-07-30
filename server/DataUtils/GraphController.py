from .EventHGraph import EventHGraph
from collections import defaultdict
class GraphController:
    def __init__(self, data_path) -> None:
        self.data_path = data_path
        self.static_event_hgraph = EventHGraph(data_path)
        self.user_hgraphs = defaultdict(lambda: EventHGraph(data_path))

    def getUserHGraph(self, uid):
        if uid not in self.user_hgraphs:
            print("creating user hgraph")
            return self.create_user_hgraph(uid, hyperedge_ids=None)
        else:
            return self.user_hgraphs[uid]

    def create_user_hgraph(self, uid, hyperedge_ids=None):
        self.user_hgraphs[uid] = EventHGraph(self.data_path, target_hyperedge_ids=hyperedge_ids)
        return self.user_hgraphs[uid]
