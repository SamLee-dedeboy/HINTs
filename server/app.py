from flask import Flask, request
from flask_cors import CORS
import json
from pprint import pprint
from DataUtils import GraphController, EventHGraph, DataTransformer, Utils, EmbeddingSearch, GptUtils, pHilbert, gosper
from collections import defaultdict

app = Flask(__name__)
CORS(app)
openai_api_key = open("openai_api_key").read()

graph_controller = GraphController(r'../preprocess/data/result/')
event_hgraph = graph_controller.static_event_hgraph
embedding_searcher = EmbeddingSearch(r'../preprocess/data/result/', openai_api_key)
data_transformer = DataTransformer()
example = json.load(open(r'../preprocess/data/result/AllTheNews/cluster_summary/example.json'))

# global vars
users = [0]
for uid in users:
    graph_controller.create_user_hgraph(uid)

gosper_curve_points = gosper.plot_level(5)
philbert_curve_points = pHilbert.peripheral_hilbert(128, 20)

@app.route("/static/hierarchy", methods=["GET"])
def get_hierarcy():
    return json.dumps(event_hgraph.hierarchy_article)

@app.route("/static/topic", methods=["POST"])
def generate_topic():
    article_ids = request.json
    # messages = GptUtils.generate_summary_message(article_ids, event_hgraph.article_dict)
    example_summaries = example['summaries']
    example_topic = example['topic']
    topic = GptUtils.explain_articles(article_ids, event_hgraph.article_dict, example_summaries, example_topic)
    return json.dumps(topic, default=vars)

@app.route("/user/article/partition//<uid>", methods=["POST"])
def get_article_partition(uid):
    uid = int(uid)
    article_level = request.json['article_level']
    entity_level = request.json['entity_level']
    # entity_node_num = request.json['entity_node_num']
    # get candidate entity nodes
    user_hgraph = graph_controller.getUserHGraph(uid)
    # reset filtering
    user_hgraph.resetFiltering()
    # candidate_entity_nodes = user_hgraph.entity_nodes_sorted[:entity_node_num]

    # article
    clusters = user_hgraph.binPartitions(article_level, type='article')
    sub_clusters = user_hgraph.binPartitions(article_level - 1, type="article") if int(article_level) > 0 else None
    clusters, article_node_dict, cluster_order, update_cluster_order = Utils.addClusterLabelAndOrder(user_hgraph.article_dict, clusters, sub_clusters, gosper_curve_points)    
    # entity
    entity_clusters = user_hgraph.binPartitions(entity_level, type='entity')
    entity_sub_clusters = user_hgraph.binPartitions(entity_level - 1, type="entity") if int(entity_level) > 0 else None
    entity_clusters, entity_node_dict, entity_cluster_order, entity_update_cluster_order = Utils.addClusterLabelAndOrder(user_hgraph.entity_dict, entity_clusters, entity_sub_clusters, philbert_curve_points)

    # article_cluster_entities = Utils.getArticleClusterEntities(user_hgraph, clusters)

    # return result
    hgraph = {
        "links": user_hgraph.entity_links,
        # articles
        "article_nodes": data_transformer.transform_article_data(article_node_dict.values()),
        "clusters": clusters,
        "sub_clusters": user_hgraph.getSubClusterNumDict(clusters.keys()),
        "cluster_order": cluster_order,
        "update_cluster_order": update_cluster_order,   
        "hierarchical_topics": user_hgraph.hierarchical_topics,
        # "article_cluster_linked_entities": article_cluster_entities,
        # entities
        "entity_nodes": user_hgraph.entity_nodes,
        "entity_clusters":  entity_clusters,
        "entity_cluster_order": entity_cluster_order,
        "entity_update_cluster_order": entity_update_cluster_order,
    }
    return json.dumps(hgraph, default=vars)

@app.route("/user/filter/<uid>", methods=["POST"])
def filter_hgraph(uid: int):
    uid = int(uid)
    article_node_ids = request.json['article_ids']
    clusters = request.json['clusters']
    user_hgraph = graph_controller.getUserHGraph(uid)
    # filter clusters
    clusters = Utils.filterClusters(clusters, article_node_ids)
    sub_clusters = user_hgraph.getSubClusters(clusters.keys(), isList=True)

    # filter hyperdege nodes and links at the same time
    # this changes the state of the user hgraph
    user_hgraph.filter_article_nodes(article_node_ids)

    # filtered_article_node_dict = Utils.addClusterLabel(filtered_article_node_dict, clusters, sub_clusters)
    # # generate cluster order
    # cluster_order = Utils.generateClusterOrder(sorted_filtered_article_nodes)
    # update_cluster_order = Utils.generateUpdateClusterOrder(cluster_order, clusters.keys(), top_level=True)
    # filtered_article_node_dict = Utils.addClusterOrder(clusters, cluster_order, update_cluster_order, filtered_article_node_dict)
    clusters, article_node_dict, cluster_order, update_cluster_order = Utils.addClusterLabelAndOrder(user_hgraph.article_dict, clusters, sub_clusters)    

    # entity
    entity_level = 3
    entity_clusters = user_hgraph.binPartitions(entity_level, type='entity')
    entity_sub_clusters = user_hgraph.binPartitions(entity_level - 1, type="entity") if int(entity_level) > 0 else None
    entity_clusters, entity_node_dict, entity_cluster_order, entity_update_cluster_order = Utils.addClusterLabelAndOrder(user_hgraph.entity_dict, entity_clusters, entity_sub_clusters)

    # article_cluster_entities = Utils.getArticleClusterEntities(user_hgraph, clusters)

    # return result
    hgraph = {
        "links": user_hgraph.entity_links,
        # articles
        "article_nodes": data_transformer.transform_article_data(article_node_dict.values()),
        "clusters": clusters,
        "sub_clusters": user_hgraph.getSubClusterNumDict(clusters.keys()),
        "cluster_order": cluster_order,
        "update_cluster_order": update_cluster_order,   
        "hierarchical_topics": user_hgraph.hierarchical_topics,
        # entities
        "entity_nodes": user_hgraph.entity_nodes,
        "entity_clusters":  entity_clusters,
        "entity_cluster_order": entity_cluster_order,
        "entity_update_cluster_order": entity_update_cluster_order,
    }
    return json.dumps(hgraph, default=vars)

@app.route("/user/expand_cluster/<uid>", methods=["POST"])
def expand_cluster(uid):
    uid = int(uid)
    # retain original setups
    cluster_label = request.json['cluster_label']
    clusters = request.json['clusters']
    user_hgraph = graph_controller.getUserHGraph(uid)
    sub_clusters = user_hgraph.getSubClusters(clusters.keys(), isList=True)
    ###############
    # expand cluster
    # generate sub clusters of targeted cluster
    article_node_ids = list(map(lambda node: node['id'], user_hgraph.article_nodes)) 
    targeted_sub_clusters = user_hgraph.getSubClusters(cluster_label)
    targeted_sub_clusters = Utils.filterClusters(targeted_sub_clusters, article_node_ids)
    # replace the targeted cluster with targeted_sub_clusters
    del clusters[cluster_label]
    for targeted_sub_cluster_label, targeted_sub_cluster_node_ids in targeted_sub_clusters.items():
        clusters[targeted_sub_cluster_label] = targeted_sub_cluster_node_ids
    # generate sub-clusters of sub_clusters
    # filter out targeted sub-sub-clusters
    targeted_sub_sub_clusters = user_hgraph.getSubClusters(targeted_sub_clusters.keys(), isList=True)
    targeted_sub_sub_clusters = Utils.filterClusters(targeted_sub_sub_clusters, article_node_ids)
    # replace the sub-clusters of targeted cluster with its sub-sub-clusters
    for targeted_sub_cluster_key in targeted_sub_clusters.keys():
        del sub_clusters[targeted_sub_cluster_key]
    for sub_sub_cluster_label, sub_sub_cluster_node_ids in targeted_sub_sub_clusters.items():
        sub_clusters[sub_sub_cluster_label] = sub_sub_cluster_node_ids
    print("--------- expansion done. ----------")
    ###############
    ###############
    # post-process
    # # add cluster label to article nodes
    # article_node_dict = Utils.addClusterLabel(user_hgraph.article_dict, clusters, sub_clusters)

    # # generate cluster order
    # cluster_order = Utils.generateClusterOrder(user_hgraph.article_nodes)
    # update_cluster_order = Utils.generateUpdateClusterOrder(cluster_order, targeted_sub_clusters.keys())
    # # add cluster order to article nodes
    # article_node_dict = Utils.addClusterOrder(clusters, cluster_order, update_cluster_order, article_node_dict)
    expanded_cluster = {}
    expanded_cluster['parent'] = cluster_label
    expanded_cluster['sub_clusters'] = list(targeted_sub_clusters.keys())
    # article
    clusters, article_node_dict, cluster_order, update_cluster_order = Utils.addClusterLabelAndOrder(user_hgraph.article_dict, clusters, sub_clusters, gosper_curve_points, expanded_cluster)
    print("--------- article nodes post-process done. ----------")

    # entity
    # TODO: add entity cluster expansion
    entity_level = 3
    entity_clusters = user_hgraph.binPartitions(entity_level, type='entity')
    entity_sub_clusters = user_hgraph.binPartitions(entity_level - 1, type="entity") if int(entity_level) > 0 else None
    entity_clusters, entity_node_dict, entity_cluster_order, entity_update_cluster_order = Utils.addClusterLabelAndOrder(user_hgraph.entity_dict, entity_clusters, entity_sub_clusters, philbert_curve_points)
    print("--------- entity nodes post-process done. ----------")

    # link entities to clusters
    # article_cluster_entities = Utils.getArticleClusterEntities(user_hgraph, clusters)
    print("--------- Entity links extraction done. ----------")

    # return result
    hgraph = {
        "links": user_hgraph.entity_links,
        "article_nodes": data_transformer.transform_article_data(article_node_dict.values()),
        "clusters": clusters,
        "sub_clusters": user_hgraph.getSubClusterNumDict(clusters.keys()),
        "cluster_order": cluster_order,
        "update_cluster_order": update_cluster_order,   
        "hierarchical_topics": user_hgraph.hierarchical_topics,
        # "article_cluster_linked_entities": article_cluster_entities,
        # entities
        "entity_nodes": user_hgraph.entity_nodes,
        "entity_clusters":  entity_clusters,
        "entity_cluster_order": entity_cluster_order,
        "entity_update_cluster_order": entity_update_cluster_order,
    }
    return json.dumps(hgraph, default=vars)

@app.route("/user/merge_cluster/<uid>", methods=["POST"])
def merge_cluster(uid):
    uid = int(uid)
    # retain original setups
    selectedClusterLabels = request.json['selectedClusters']
    clusters = request.json['clusters']
    user_hgraph = graph_controller.getUserHGraph(uid)
    ###############
    # merge cluster
    # generate a new cluster that has the selected clusters as sub-clusters
    merged_article_node_ids = Utils.flattenClusters(clusters, selectedClusterLabels)
    new_cluster_label = Utils.generateNewClusterLabel(clusters.keys())
    clusters[new_cluster_label] = merged_article_node_ids
    # delete selected clusters
    for selectedClusterLabel in selectedClusterLabels:
        del clusters[selectedClusterLabel]

    sub_clusters = user_hgraph.getSubClusters(clusters.keys(), isList=True)
    # article
    clusters, article_node_dict, cluster_order, update_cluster_order = Utils.addClusterLabelAndOrder(user_hgraph.article_dict, clusters, sub_clusters)
    print("--------- article nodes post-process done. ----------")

    # entity
    # TODO: add entity cluster expansion
    entity_level = 3
    entity_clusters = user_hgraph.binPartitions(entity_level, type='entity')
    entity_sub_clusters = user_hgraph.binPartitions(entity_level - 1, type="entity") if int(entity_level) > 0 else None
    entity_clusters, entity_node_dict, entity_cluster_order, entity_update_cluster_order = Utils.addClusterLabelAndOrder(user_hgraph.entity_dict, entity_clusters, entity_sub_clusters)
    print("--------- entity nodes post-process done. ----------")

    # link entities to clusters
    # article_cluster_entities = Utils.getArticleClusterEntities(user_hgraph, clusters)
    print("--------- Entity links extraction done. ----------")

    # return result
    hgraph = {
        "links": user_hgraph.entity_links,
        "article_nodes": data_transformer.transform_article_data(article_node_dict.values()),
        "clusters": clusters,
        "sub_clusters": user_hgraph.getSubClusterNumDict(clusters.keys()),
        "cluster_order": cluster_order,
        "update_cluster_order": update_cluster_order,   
        "hierarchical_topics": user_hgraph.hierarchical_topics,
        # "article_cluster_linked_entities": article_cluster_entities,
        # entities
        "entity_nodes": user_hgraph.entity_nodes,
        "entity_clusters":  entity_clusters,
        "entity_cluster_order": entity_cluster_order,
        "entity_update_cluster_order": entity_update_cluster_order,
    }
    return json.dumps(hgraph, default=vars)

    
@app.route("/user/storyline/<uid>", methods=["POST"])
def get_storyline(uid):
    uid = int(uid)
    clusters = request.json['clusters']
    user_hgraph = graph_controller.getUserHGraph(uid)
    article_node_dict = Utils.addClusterLabel(user_hgraph.article_dict, clusters)
    entity_node_dict = user_hgraph.entity_dict
    entity_links = user_hgraph.entity_links

    storyline = defaultdict(lambda :defaultdict(list))
    for entity_link in entity_links:
        source = entity_link['source']
        target = entity_link['target']
        if source in article_node_dict:
            article_node = article_node_dict[source]
            entity_node = entity_node_dict[target]
        else:
            article_node = article_node_dict[target]
            entity_node = entity_node_dict[source]

        # bin article nodes by cluster
        cluster_label = article_node['cluster_label']
        storyline[entity_node['id']][cluster_label].append(article_node['id'])
    res = {
        "storyline": storyline,
        "links": entity_links,
        "entity_data": entity_node_dict,
        "article_data": article_node_dict,
    }
    Utils.save_json(res, 'tmp_storylinedata.json')
    return json.dumps(res)

@app.route("/static/p_hilbert/", methods=["POST"])
def peripheral_hilbert():
    width = request.json['width']
    height = request.json['height']
    p_hilbert = pHilbert.peripheral_hilbert(width, height)
    return json.dumps(p_hilbert)

@app.route("/static/gosper/", methods=["POST"])
def gosper_curve():
    level = request.json['level']
    coords = gosper.plot_level(level)
    return json.dumps(coords)


@app.route("/static/search/", methods=["POST"])
def search():
    query = request.json['query']
    base = request.json['base']
    doc_id_relevance = embedding_searcher.search(query=query, base=base)
    # binary search to find the most appropriate threshold
    # suggested_threshold = GptUtils.binary_search_threshold(doc_id_relevance, query)
    suggested_threshold = 0.8

    doc_data = []
    for (doc_id, relevance, summary) in doc_id_relevance:
        doc_data.append({
            "doc_id": doc_id,
            "relevance": relevance,
            "summary": summary
        })

    # res = { doc_id: relatedness for doc_id, relatedness in docs }
    return json.dumps({"docs": doc_data, "suggested_threshold": suggested_threshold})

# @app.route("/data/cluster", methods=["POST"])
# def get_cluster():
#     level = request.json['level']
#     cluster_label = request.json['cluster_label']
#     print(level, cluster_label)
#     article_nodes, \
#     entity_nodes, \
#     argument_nodes, \
#     candidate_entity_nodes, \
#     links, \
#     connected_clusters = event_hgraph.getClusterDetail(level, cluster_label)

#     cluster = {
#         "article_nodes": data_transformer.transform_article(article_nodes),
#         # "entity_nodes": entity_nodes,
#         # "argument_nodes": argument_nodes,
#         "candidate_entity_nodes": candidate_entity_nodes,
#         "links": links,
#         # "connected_clusters": connected_clusters,
#     }
#     return json.dumps(cluster, default=vars)
