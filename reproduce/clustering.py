import networkx as nx
import hypernetx as hnx
import numpy as np
from scipy import spatial
import json
import hypernetx.algorithms.hypergraph_modularity as hmod
import igraph as ig
from collections import defaultdict
import copy
import math
import argparse
import time

def convert_to_graph(H):
    component_subgraphs = H.s_component_subgraphs(edges=False, return_singletons=True)
    weights = defaultdict(lambda: defaultdict(dict))
    total = 0
    v_name_set = set()
    total_edges = 0
    print("finding connected components...")
    for s_component in component_subgraphs:
        print("total: ", total)
        # if total > 2500: break 
        total += s_component.shape[0]
        if s_component.shape[0] == 1:
            break # early termination, the rest of the components is isolated
        print("component_size: ", s_component.shape[0])
        print("reweighting...")
        cc = hmod.two_section(s_component)
        print("two_section graph size:", cc.vcount())
        index2id_dict = {}
        for v in cc.vs:
            index2id_dict[v.index] = v['name']

        deleted_vertices = []
        for v in cc.vs:
            if v['name'] in v_name_set:
                deleted_vertices.append(v['name'])
            v_name_set.add(v['name'])

        deleted_edges = []
        for e in cc.es:
            if index2id_dict[e.source] in deleted_vertices or index2id_dict[e.target] in deleted_vertices:
                deleted_edges.append((e.source, e.target))
        cc.delete_edges(deleted_edges)
        total_edges += len(cc.es)
        for v in cc.vs:
            weights[v['name']][v['name']]['weight'] = 0
        if len(cc.es) != 0:
            for e in cc.es:
                weights[cc.vs[e.source]['name']][cc.vs[e.target]['name']]['weight'] = e['weight']
                weights[cc.vs[e.target]['name']][cc.vs[e.source]['name']]['weight'] = e['weight']
    G_ccs = ig.Graph.DictDict(weights)
    # add isolated nodes back
    all_nodes = [node for node in H.nodes()]
    largest_cc_nodes = [v['name'] for v in G_ccs.vs]
    for node_id in all_nodes:
        if node_id not in largest_cc_nodes:
            G_ccs.add_vertex(node_id)
    return G_ccs

def distance_matrix(G, attr_dict):
    embeddings = np.array([attr_dict[v.index] for v in G.vs])
    return spatial.distance.cdist(embeddings, embeddings, metric='cosine')

def ravasz(G, attr_dict, D=None):
    def weighted_degree(A):
        return {v: sum(A[v]) for v in range(0, len(A))}
    
    def weighted_common_neighbors(N, A, i, j):
        i_neighbors = N[i]
        j_neigobors = N[j]
        common_neighbors = list(set(i_neighbors).intersection(set(j_neigobors)))
        return sum([A[i][v] for v in common_neighbors]) + sum([A[j][v] for v in common_neighbors])


    def weighted_TO(i, j, N, A, K):
        J = weighted_common_neighbors(N, A, i, j)
        return J/ (min(K[i], K[j]) + 1 - A[i][j])
    
    def map_max(twod_list, max_value):
        return [[min(max_value, x) for x in row] for row in twod_list]

    def partition(G):
        P = {}
        for index, v in enumerate(G.vs):
            P[v.index] = index
        return P 

    def similarity(G, A, K, D):
        SS = 1 - D # semantic similarity
        n = G.vcount()
        for i in range(n):
            SS[i][i] = -math.inf
        
        # CS: connectivity similarity
        CS = np.zeros((n, n))
        print("generating neighbors: ", n, "(This could take a while)")
        N = {v.index: G.neighbors(v) for v in G.vs}
        for i in range(n):
            for j in range(n):
                if i == j: CS[i][j] = -math.inf
                else:
                    CS[i][j] = weighted_TO(i, j, N, A, K)
        return (SS + CS) / 2 # alpha = 1/2

    def reverse_index(P):
        comms = defaultdict(list)
        for v, comm in P.items():
            comms[comm].append(v)
        renumber_dict = {}
        for index, comm in enumerate(list(comms.keys())):
            renumber_dict[comm] = index
        renumbered_comms_dict = {
            renumber_dict[comm]: vertices for comm, vertices in comms.items()
        }
        return renumbered_comms_dict

    def calculate_weights(comm1, comm2, A):
        total = 0
        for v1 in comm1:
            for v2 in comm2:
                total += A[v1][v2]
        return total

    def fusion_matrix_adjacency(A, comms):
        print("fusion matrix adjacency communities: ", len(comms))

        new_weights = defaultdict(lambda: defaultdict(dict))
        for comm1, vertices1 in comms.items():
            for comm2, vertices2 in comms.items():
                new_weights[comm1][comm2]['weight'] = calculate_weights(vertices1, vertices2, A)
                # weights[comm2][comm1]['weight'] = weights[comm1][comm2]['weight']
        clustered_G = ig.Graph.DictDict(new_weights)
        clustered_A = map_max(clustered_G.get_adjacency(attribute='weight'), 1)
        return clustered_G, clustered_A
    
    def recalculate_attr(attr_dict, comms):
        new_attr_dict = {}
        for comm, vertices in comms.items():
            avg_attr = np.mean(np.array([attr_dict[v] for v in vertices]), axis=0)
            new_attr_dict[comm] = avg_attr
        return new_attr_dict

    levels = []
    P = partition(G)
    comms_dict = reverse_index(P)
    ori_graph_partition = P
    levels = defaultdict(list)
    level = 0
    # init levels
    for v in G.vs:
        levels[v.index].append(P[v.index])
    A = map_max(G.get_adjacency(attribute='weight'), 1)
    if D is None:
        D = distance_matrix(G, attr_dict)
    while(True):
        # init level slot
        for v, cur_levels in levels.items():
            cur_levels.append(None)
        print("clustering begin")
        print("initial nodes:", G.vcount())
        print("calculating weighted_degree")
        K = weighted_degree(A)
        print("calculating similarity matrix")
        similarity_matrix = similarity(G, A, K, D)
        print("calculating reverse index of G")
        ori_graph_comms_dict = reverse_index(ori_graph_partition)
        most_similar_nodes = set()
        for v in G.vs:
            print("finding most similar node")
            most_similar_node = max(range(len(similarity_matrix[v.index])), key=similarity_matrix[v.index].__getitem__)

            print("moving node: ", v.index, " from community: ", P[v.index], " to community: ", P[most_similar_node])
            most_similar_nodes.add(P[most_similar_node])
            print(len(ori_graph_comms_dict), len(ori_graph_partition))
            # rewrite at G'
            P[v.index] = P[most_similar_node]
        for v, c in P.items():
            for node in ori_graph_comms_dict[v]:
                ori_graph_partition[node] = c
                levels[node][level] = c
        ori_graph_comms_dict = reverse_index(ori_graph_partition)
        print("most similar nodes: ", len(most_similar_nodes), len(ori_graph_comms_dict))

        level += 1
        print("one iteration done")
        comms_dict = reverse_index(P)
        print("total nodes in communities:", sum([len(x) for x in ori_graph_comms_dict.values()]))
        c_G, c_A  = fusion_matrix_adjacency(A, comms_dict)
        print("clusters: ", c_G.vcount())
        # preserve the hierarchy
        attr_dict = recalculate_attr(attr_dict, comms_dict)
        # construct new distances between clusters
        D = distance_matrix(c_G, attr_dict)
        P = partition(c_G)
        # assign the result to operate recursively
        if G.vcount() < 10 or G.vcount() == c_G.vcount(): break
        print("pass done. ")
        G = c_G
        A = c_A
    return levels

def _renumber_dict(P):
    comm_set = set(P.values())
    renumber_dict = {comm: index for index, comm in enumerate(comm_set)}
    return renumber_dict

def levels_to_partitions(G, levels):
    partitions = []
    for v in G.vs:
        levels[v.index] = levels[v.index][0:-1]
    for level in range(len(levels[0])):
        P = {}
        for v in G.vs:
            P[v['name']] = levels[v.index][level]
        renumber_dict = _renumber_dict(P)
        P = {v: renumber_dict[comm] for v, comm in P.items()}
        for v in G.vs:
            levels[v.index][level] = P[v['name']]
        partitions.append(P)
    last_partition = partitions[-1]
    comm_labels = set(last_partition.values())
    if len(comm_labels) > 1:
        partitions.append({v['name']: 0 for v in G.vs})
        for v in G.vs:
            levels[v.index].append(0)
    return partitions, levels

def add_dummy_partition(partitions):
    first_partition = partitions[0]
    dummy_partition = {}
    for index, node_id in enumerate(list(first_partition.keys())):
        dummy_partition[node_id] = index
    partitions.insert(0, dummy_partition)
    return partitions

def get_level_transition(levels):
    nested_comms = {}
    for i in range(len(levels[0])-1):
        for v, transitions in levels.items():
            trans_children_title = "L-{}-{}".format(i, transitions[i])
            trans_parent_title = "L-{}-{}".format(i+1, transitions[i+1])
            # if children is the first level
            if trans_children_title not in nested_comms:
                # create leaf
                nested_comms[trans_children_title] = {
                    "title": trans_children_title,
                    "key": trans_children_title
                }
                # add to parent 
                if trans_parent_title not in nested_comms:
                    nested_comms[trans_parent_title] = {
                        "title": trans_parent_title,
                        "key": trans_parent_title,
                        'children': [nested_comms[trans_children_title]]
                    }
                # avoid adding duplicate children
                elif trans_children_title not in [child['title'] for child in nested_comms[trans_parent_title]['children']]:
                    nested_comms[trans_parent_title]['children'].append(nested_comms[trans_children_title])
            else:
                # if children is not the first level
                # add to parent directly
                if trans_parent_title not in nested_comms:
                    nested_comms[trans_parent_title] = {
                        "title": trans_parent_title,
                        "key": trans_parent_title,
                        'children': [nested_comms[trans_children_title]]
                    }
                # avoid adding duplicate children
                elif trans_children_title not in [child['title'] for child in nested_comms[trans_parent_title]['children']]:
                    nested_comms[trans_parent_title]['children'].append(nested_comms[trans_children_title])
    final_level = len(levels[0])-1
    return nested_comms['L-{}-{}'.format(final_level, 0)]

def dfs(hierarchy, leaf_children_dict):
    cur_level_label = hierarchy['title'].split("-")[1]
    cur_cluster_label = hierarchy['title'].split("-")[2]
    new_level_label = str(int(cur_level_label) + 1)
    hierarchy['title'] = "L-{}-{}".format(new_level_label, cur_cluster_label)
    hierarchy['key'] = "L-{}-{}".format(new_level_label, cur_cluster_label)
    if 'children' in hierarchy:
        for child in hierarchy['children']:
            dfs(child, leaf_children_dict)
    else:
        dummy_clusters = leaf_children_dict[cur_cluster_label]
        hierarchy['children'] = []
        for dummy_cluster_label in dummy_clusters:
            hierarchy['children'].append({ 
                "title": "L-0-{}".format(dummy_cluster_label),
                "key": "L-0-{}".format(dummy_cluster_label),
            })
    return

def add_dummy_hierarchy(partitions, hierarchies):
    first_partition = partitions[0]
    second_partition = partitions[1]
    second_level_children_dict = defaultdict(list)
    for node_id, dummy_cluster_label in first_partition.items():
        parent_cluster_label = second_partition[node_id]
        second_level_children_dict[str(parent_cluster_label)].append(dummy_cluster_label)
    dfs(hierarchies, second_level_children_dict)
    return hierarchies

def save_json(data, filepath=r'new_data.json'):
    with open(filepath, 'w') as fp:
        json.dump(data, fp, indent=4, ensure_ascii=False)

def read_embeddings(dataset, data_type):
    if data_type == 'entity':
        entity_data = json.load(open(f'{dataset}/data/result/server/keyword_explanations_embeddings.json'))
        entity_embeddings = {entity_id: entity['embedding'] for entity_id, entity in entity_data.items()}
        return entity_embeddings
    elif data_type == 'article':
        article_data = json.load(open(f'{dataset}/data/result/server/article_embeddings.json'))
        article_embeddings = {str(article['doc_id']): article['embedding'] for _, article in article_data.items()}
        return article_embeddings

def main():
    start_time = time.time()
    parser = argparse.ArgumentParser(description='Clustering with Ravasz Algorithm on article/entity in VisPub/AllTheNews.')
    parser.add_argument("-dataset", help="The dataset to parse.", choices=["VisPub", "AllTheNews"])
    parser.add_argument("-data_type", help="The type of hypergraph", choices=["article", "entity"])
    args = vars(parser.parse_args())
    # read network
    B = nx.node_link_graph(json.load(open(f'{args["dataset"]}/data/result/network/hgraph.json')))
    H = hnx.Hypergraph.from_bipartite(B)
    if args['data_type'] == 'article':
        # dual_H is for clustering articles, H is for clustering entities
        H = H.dual()
    embeddings = read_embeddings(args['dataset'], args['data_type'])

    G_ccs = convert_to_graph(H)
    attr_dict = {v.index: embeddings[v['name']] for v in G_ccs.vs}
    mid_time = time.time()
    D = distance_matrix(G_ccs, attr_dict)
    levels = ravasz(G_ccs, attr_dict, D)

    # post-processing: convert to frontend-friendly format
    partitions, renumbered_levels = levels_to_partitions(G_ccs, copy.deepcopy(levels))
    partitions = add_dummy_partition(partitions)
    save_json(partitions, f'{args["dataset"]}/data/result/server/ravasz_partitions_{args["data_type"]}.json')

    hierarchies = get_level_transition(renumbered_levels)
    hierarchies = add_dummy_hierarchy(partitions, hierarchies)
    save_json(hierarchies, f'{args["dataset"]}/data/result/server/ravasz_hierarchies_{args["data_type"]}.json')
    end_time = time.time()
    print("execution time: ", end_time - start_time, " seconds")
    print("clustering time: ", end_time - mid_time, " seconds")

if __name__ == "__main__":
    main()
