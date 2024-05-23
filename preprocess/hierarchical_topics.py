from collections import defaultdict
from pprint import pprint
from openai import OpenAI, RateLimitError, APITimeoutError
import time
import json
from json import JSONDecodeError
import argparse
import random 
import tiktoken
api_key = open("api_key").read()
client=OpenAI(api_key=api_key, timeout=10)

def save_json(data, filepath=r'new_data.json'):
    with open(filepath, 'w') as fp:
        json.dump(data, fp, indent=4, ensure_ascii=False)

def within_token_length(model, content, max_length=16385):
    enc = tiktoken.encoding_for_model(model)
    return len(enc.encode(content)) < max_length

def request_gpt(messages, model="gpt-3.5-turbo-0125", format=None):
    try:
        if format == "json":
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.5,
                response_format={ "type": "json_object" }
            )
            return json.loads(response.choices[0].message.content)
        else:
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.5,
            )
            return response.choices[0].message.content
    except JSONDecodeError as e:
        print(e)
        time.sleep(5)
        return request_gpt(client, messages, model, format)
    except RateLimitError as e:
        print(e)
        time.sleep(5)
        return request_gpt(client, messages, model, format)
    except APITimeoutError as e:
        print(e)
        time.sleep(5)
        return request_gpt(client, messages, model, format)

def clusterLabelToNodes(cluster_labels, partition, node_dict):
    reverse_partition = defaultdict(list)
    for node_id, cluster_label in partition.items():
        reverse_partition[str(cluster_label)].append(node_id)
    nodes = []
    for cluster_label in cluster_labels:
        for hyperedge_id in reverse_partition[cluster_label.split("-")[2]]:
            nodes.append(node_dict[hyperedge_id])

    return nodes

def query_leaf_topic(nodes, node_type, dataset):
    if node_type == 'article':
        example = json.load(open(f'data/result/{dataset}/cluster_summary/example_article.json'))
        summaries = [node['summary'] for node in nodes]
        enc = tiktoken.encoding_for_model("gpt-3.5-turbo-0125")
        max_token_length = 16385
        summaries_message = ""
        for index, summary in enumerate(summaries):
            if len(enc.encode(summaries_message + summary)) > max_token_length - 1000: continue
            identifier = 'Article' if dataset == 'AllTheNews' else 'Abstract'
            summaries_message += f"{identifier} {index+1}: \n"
            summaries_message += summary + '\n\n\n'
        if dataset == "AllTheNews":
            messages = [
                { 
                    "role": "system", 
                    "content": """
                        You are a news article summarization system. 
                        The user will provide you with a set of summarized news articles, your job is to further summarize them into one noun phrase.
                        Use words that are already in the articles, and try to use as few words as possible.
                    """
                },
            ]
        if dataset == 'VisPub':
            messages = [
                { 
                    "role": "system", 
                    "content": """
                        You are a visualization research paper summarization system. 
                        The user will provide you with a set of abstracts of visualization research papers.
                        They are manually categorized by another person, so they are discussing the same topic.
                        Your job is to find out what that topic is.
                        Reply with a noun phrase less than five words. 
                    """
                },
                { "role": "system", "name": "example_user", "content": example['leaf']['summaries']},
                { "role": "system", "name": "example_system", "content": example['leaf']['topic']},
                { "role": "user", "content": summaries_message}
            ]
        topic = request_gpt(messages)
        return topic
    
    if node_type == "entity": 
        if len(nodes) > 20:
            print("querying non-leaf")
            res_key = "categories"
            if dataset == "AllTheNews":
                res_key = "categories"
                messages = [
                    { 
                        "role": "system", 
                        "content": """
                            You are an entity summarization system.
                            The user will provide you with a list of entities, they can be people, places, or things.
                            The user wants to get a gist of what entities are in the list.
                            First, split the entities into different categories.
                            Then, assign each category a human-readable name.
                            If entities in a category are all related to a specific entity, use that entity as the category.
                            Limit the number of categories to be less than 5 by keeping only the important categories.
                            Reply with the following JSON format:
                            { "categories": [Category_1, Category_2, Category_3, ...]}
                            Do not reply more than 5 categories.
                        """
                    },
                    { 
                        "role": "user", "content": """ Keywords: {} \n """.format(", ".join(nodes))
                    }
                ]
            if dataset == "VisPub":
                res_key = "categories"
                messages = [
                    { 
                        "role": "system", 
                        "content": """
                            You are an visualization research paper keyword summarization system.
                            The user will provide you with a list of keywords, they are terminologies in visualization research papers.
                            The user wants to get a gist of what keywords are in the list, but the list is too long.
                            First, split the keywords into different categories.
                            Then, assign each category a human-readable name.
                            If keywords in a category are all related to a specific keyword, use that keyword as the category.
                            Limit the number of categories to be less than 5 by keeping only the important categories.
                            Do not reply more than 5 categories.
                            Reply with the following JSON format in a single line:
                            { "categories": [Category_1, Category_2, Category_3, ...]}
                        """
                    },
                    { 
                        "role": "user", "content": """ Keywords: {} \n """.format(", ".join(nodes))
                    }
                ]
        else:        
            print("querying leaf")
            assert(len(nodes) >= 1)
            if dataset == "AllTheNews":
                res_key = "entities"
                messages = [
                    { 
                        "role": "system", 
                        "content": """
                            You are an entity summarization system.
                            The user will provide you with a list of entities, they can be people, places, or things.
                            The user wants to get a gist of what entities are in the list.
                            Pick out a few entities that best represents the list.
                            Avoid picking out overlapping entities.
                            Limit the number of picked entities to be less than 5 by keeping only the important ones.
                            Reply with the following JSON format:
                            { "entities" : [Entity, Entity_2, Entity_3, ...] }
                        """
                    },
                    { 
                        "role": "user", "content": """ Entity: {} \n """.format(", ".join(nodes))
                    }
                ]
            if dataset == "VisPub":
                res_key = "keywords"
                messages = [
                    { 
                        "role": "system", 
                        "content": """
                            You are an visualization research paper keyword summarization system.
                            The user will provide you with a list of keywords, they are terminologies in visualization research papers.
                            The user wants to get a gist of what keywords are in the list, but the list is too long.
                            Pick out only a few keywords that best represents the list.
                            Avoid picking out overlapping keywords.
                            Limit the number of picked keywords to be less than 5 by keeping only the important ones.
                            Reply with the following JSON format:
                            { "keywords" : [Keyword_1, Keyword_2, Keyword_3, ...] }
                        """
                    },
                    { 
                        "role": "user", "content": """ Keywords: {} \n """.format(", ".join(nodes))
                    }
                ]
        success = False
        while not success:
            try:
                topic = request_gpt(messages, format="json")
                topic = ", ".join(topic[res_key])
                success = True
            except Exception as e:
                print(e)
                continue
        return topic

def query_cluster_topic(cluster_subtopics, cluster_samples, dataset):
    # example = json.load(open(r'data/result/AllTheNews/cluster_summary/example_article.json'))
    example = json.load(open(f'data/result/{dataset}/cluster_summary/example_article.json'))
    query = "Sub-topics: "
    sample_summaries = ""
    query += ", ".join(cluster_subtopics) + '\n\n\n'
    for index, cluster_sample in enumerate(cluster_samples):
        # sample_summaries += "Article {}: \n".format(index+1)
        sample_summaries += "Abstract {}: \n".format(index+1)
        sample_summaries += cluster_sample['summary'] + '\n\n\n'

    # All The News
    if dataset == "AllTheNews":
        messages = [
            { 
                "role": "system", 
                "content": """
                    You are a news article categorization system. 
                    The user will provide you with a list of sub-topics of news articles and a few examples from the sub-topics.
                    Your job is to further categorize the sub-topics into a single noun-phrase that best summarizes all the sub-topics.
                    Try to reuse the words in the examples.
                """
            },
            { "role": "system", "name": "example_user", "content": example['non-leaf']['summaries']},
            { "role": "system", "name": "example_system", "content": example['non-leaf']['topic']},
            { "role": "user", "content": query}
        ]
    if dataset == "VisPub":
        # VisPub
        messages = [
            { 
                "role": "system", 
                "content": """
                    You are a visualization research paper summarization system. 
                    You generate topics for a set of visualization research papers.
                    The user will provide you with a list of sub-topics and a few example abstracts from the sub-topics.
                    Your job is to further categorize the sub-topics into a single noun-phrase that best summarizes all the sub-topics.
                    Try to reuse the words in the sub-topics.
                    Reply with a single noun phrase in less than 5 words.
                """
            },
            { "role": "system", "name": "example_user", "content": example['non-leaf']['summaries']},
            { "role": "system", "name": "example_system", "content": example['non-leaf']['topic']},
            { "role": "user", "content": query}
        ]
    topic = request_gpt(messages)
    return topic

def add_hierarchical_topic(hierarchy, partitions, node_dict, node_type, topic_dict, filepath, dataset, sampleFlag=True):
    dfs(hierarchy, partitions, node_dict, node_type, topic_dict, filepath, dataset, sampleFlag)
    return topic_dict

def dfs(hierarchy, partitions, node_dict, node_type, topic_dict, filepath, dataset, sampleFlag=True):
    if hierarchy['key'] in topic_dict: return # if already have a topic, skip. This happens when continuing from a break point
    level = int(hierarchy['key'].split('-')[1])
    if level == 1: # at level 1, use the children (leaf nodes) to generate a topic
        # collect the leaf node summaries
        children_labels = list(map(lambda x: x['key'], hierarchy['children']))
        nodes = clusterLabelToNodes(children_labels, partitions[0], node_dict)
        docs = []
        if node_type == "entity":
            docs = [node['title'] for node in nodes]
        else:
            docs = nodes
        # generate the topic
        gpt_topic = query_leaf_topic(docs, node_type=node_type, dataset=dataset)
        # record the result
        topic_dict[hierarchy['key']] = gpt_topic
        print(hierarchy['key'], gpt_topic)
        save_json(topic_dict, filepath)
        return
    else:
        all_nodes = []
        # standard dfs
        for child in hierarchy['children']:
            dfs(child, partitions, node_dict, node_type, topic_dict, filepath, dataset, sampleFlag)
            # sample from the sub-topics
            level = int(child['key'].split('-')[1])
            nodes = clusterLabelToNodes([child['key']], partitions[level], node_dict)
            all_nodes += nodes
        # use the sub-topics and samples to generate a topic for the current node
        if sampleFlag:
            sample_articles = random.sample(all_nodes, min(10, len(all_nodes)))
        # generate the topic
        if node_type == 'article':
            # article
            cluster_subtopics = [topic_dict[child['key']] for child in hierarchy['children']]
            gpt_topic = query_cluster_topic(cluster_subtopics, sample_articles, dataset)
        else: # entity
            cluster_subtopics = [topic_dict[child['key']].split(",") for child in hierarchy['children']]
            cluster_subtopics = [item.strip() for sublist in cluster_subtopics for item in sublist] # flatten
            gpt_topic = query_leaf_topic(cluster_subtopics, node_type='entity', dataset=dataset)
        # record the result
        topic_dict[hierarchy['key']] = gpt_topic
        print(hierarchy['key'], gpt_topic)
        save_json(topic_dict, filepath)
        return

def main():
    start_time = time.time()
    parser = argparse.ArgumentParser(description='Clustering with Ravasz Algorithm on article/entity in VisPub/AllTheNews.')
    parser.add_argument("-dataset", help="The dataset to parse.", choices=["VisPub", "AllTheNews"])
    parser.add_argument("-data_type", help="The type of hypergraph", choices=["article", "entity"])
    args = vars(parser.parse_args())
    print("reading data...")
    hierarchy = json.load(open(f'test/data/result/{args['dataset']}/network/server/ravasz_hierarchies_{args['data_type']}.json'))
    partitions = json.load(open(f'test/data/result/{args['dataset']}/network/server/ravasz_partitions_{args['data_type']}.json'))
    data_type_plural = "entities" if args['data_type'] == "entity" else "articles"
    node_dict = json.load(open(f'test/data/result/{args['dataset']}/network/{data_type_plural}.json'))
    result_file_path = f'test/data/result/{args['dataset']}/network/hierarchical_topics_{data_type_plural}.json'
    try:
        topic_dict = json.load(open(result_file_path))
    except FileNotFoundError:
        topic_dict = {}
    sampleFlag = args['data_type'] == 'article' # entity hierarchies do not need sampling
    print("generating hierarchical topics...")
    topic_dict = add_hierarchical_topic(hierarchy, partitions, node_dict, args['data_type'], topic_dict, result_file_path, args['dataset'], sampleFlag=sampleFlag)
    end_time = time.time()
    print("time elapsed:", end_time - start_time, " seconds")
    # entity took 10 minutes
if __name__ == "__main__":
    main()