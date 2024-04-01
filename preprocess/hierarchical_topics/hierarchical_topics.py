from collections import defaultdict
from pprint import pprint
import json
import requests
import random
from openai import OpenAI
import time

api_key = open("api_key").read()
# openai.api_key = api_key
client=OpenAI(api_key=api_key)

def save_json(data, filepath=r'new_data.json'):
    with open(filepath, 'w') as fp:
        json.dump(data, fp, indent=4)

def request_chatgpt_gpt4(messages, format=None):
    if format == "json":
        response = client.chat.completions.create(
            model="gpt-4-1106-preview",
            messages=messages,
            response_format={ "type": "json_object" },
            temperature=0
        )
    else:
        response = client.chat.completions.create(
            model="gpt-4-1106-preview",
            messages=messages,
            temperature=0
        )
    return response.choices[0].message.content

def clusterLabelToNodes(cluster_labels, partition, hyperedge_dict):
    reverse_partition = defaultdict(list)
    for node_id, cluster_label in partition.items():
        reverse_partition[str(cluster_label)].append(node_id)
    hyperedges = []
    for cluster_label in cluster_labels:
        for hyperedge_id in reverse_partition[cluster_label.split("-")[2]]:
            hyperedges.append(hyperedge_dict[hyperedge_id])

    return hyperedges

def query_leaf_topic(nodes, node_type):
    if node_type == 'article':
        # example = json.load(open(r'data/result/AllTheNews/cluster_summary/example_article.json'))
        # example = json.load(open(r'data/result/VisPub/cluster_summary/example_article.json'))
        example = json.load(open(r'example_article.json'))
        summaries = [node['summary'] for node in nodes]
        summaries_message = ""
        for index, summary in enumerate(summaries):
            # summaries_message += "Article {}: \n".format(index+1)
            summaries_message += "Abstract {}: \n".format(index+1)
            summaries_message += summary + '\n\n\n'
        messages = [
            # All The News
            # { 
            #     "role": "system", 
            #     "content": """
            #         You are a news article summarization system. 
            #         The user will provide you with a set of summarized news articles, your job is to further summarize them into one noun phrase.
            #         Use words that are already in the articles, and try to use as few words as possible.
            #     """
            # },
            # VisPub
            
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
        topic = request_chatgpt_gpt4(messages)
        return topic
    else: # keywords
        # example = json.load(open(r'data/result/AllTheNews/cluster_summary/example_entity.json'))
        # example = json.load(open(r'data/result/VisPub/cluster_summary/example_entity.json'))
        if len(nodes) > 20:
            print("querying non-leaf")
            messages = [
            # All The News
            # { 
            #     "role": "system", 
            #     "content": """
                    # You are an entity summarization system.
                    # The user will provide you with a list of entities, they can be people, places, or things.
                    # The user wants to get a gist of what entities are in the list.
                    # First, split the entities into different categories.
                    # Then, assign each category a human-readable name.
                    # If entities in a category are all related to a specific entity, use that entity as the category.
                    # Limit the number of categories to be less than 5 by keeping only the important categories.
                    # Reply with the following format:
                    # Category 1, Category 2, Category 3, ...
                    # Do not reply more than 5 categories.
            #     """
            # },

            # VisPub
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
                    Reply with the following format in a single line:
                    Category_1, Category_2, Category_3, ...
                """
            },
            # # # example 0
            # { "role": "system", "name": "example_user", "content": 
            # """
            # Entities: {} \n
            # """.format(example['non-leaf'][0]['entities'])
            # },
            # { "role": "system", "name": "example_system", "content": example['non-leaf'][0]['category']},
            # # example 1
            # { "role": "system", "name": "example_user", "content": 
            # """
            # Entities: {} \n
            # """.format(example['non-leaf'][1]['entities'])
            # },
            # { "role": "system", "name": "example_system", "content": example['non-leaf'][1]['category']},
            { "role": "user", "content": 
            """
            Keywords: {} \n
            """.format(", ".join(nodes))
            }
        ]
        else:        
            print("querying leaf")
            messages = [
                # All The News
                # { 
                #     "role": "system", 
                #     "content": """
                #         You are an entity summarization system.
                #         The user will provide you with a list of entities, they can be people, places, or things.
                #         The user wants to get a gist of what entities are in the list.
                #         Pick out a few entities that best represents the list.
                #         Avoid picking out overlapping entities.
                #         Limit the number of picked entities to be less than 5 by keeping only the important ones.
                #     """
                # },

                { 
                    "role": "system", 
                    "content": """
                        You are an visualization research paper keyword summarization system.
                        The user will provide you with a list of keywords, they are terminologies in visualization research papers.
                        The user wants to get a gist of what keywords are in the list, but the list is too long.
                        Pick out only a few keywords that best represents the list.
                        Avoid picking out overlapping keywords.
                        Limit the number of picked keywords to be less than 5 by keeping only the important ones.
                        Reply with the following format:
                        Keyword_1, Keyword_2, Keyword_3, ...
                    """
                },
                # # example 1
                # { "role": "system", "name": "example_user", "content": 
                # """
                # Entities: {} \n
                # What kinds of entities are there? \n
                # """.format(example['leaf'][0]['entities'])
                # },
                # { "role": "system", "name": "example_system", "content": example['leaf'][0]['category']},
                # # example 2
                # { "role": "system", "name": "example_user", "content": 
                # """
                # Entities: {} \n
                # What kinds of entities are there? \n
                # """.format(example['leaf'][1]['entities'])
                # },
                # { "role": "system", "name": "example_system", "content": example['leaf'][1]['category']},
                # user input
                { "role": "user", "content": 
                """
                Keywords: {} \n
                """.format(", ".join(nodes))
                }
            ]
        topic = request_chatgpt_gpt4(messages)
        return topic

def query_cluster_topic(cluster_subtopics, cluster_samples, node_type):
    if node_type == 'article':
        # example = json.load(open(r'data/result/AllTheNews/cluster_summary/example_article.json'))
        # example = json.load(open(r'data/result/VisPub/cluster_summary/example_article.json'))
        example = json.load(open(r'example_article.json'))
        query = "Sub-topics: "
        sample_summaries = ""
        query += ", ".join(cluster_subtopics) + '\n\n\n'
        for index, cluster_sample in enumerate(cluster_samples):
            # sample_summaries += "Article {}: \n".format(index+1)
            sample_summaries += "Abstract {}: \n".format(index+1)
            sample_summaries += cluster_sample['summary'] + '\n\n\n'

        # All The News
        # messages = [
        #     { 
        #         "role": "system", 
        #         "content": """
        #             You are a news article categorization system. 
        #             The user will provide you with a list of sub-topics of news articles and a few examples from the sub-topics.
        #             Your job is to further categorize the sub-topics into a single noun-phrase that best summarizes all the sub-topics.
        #             Try to reuse the words in the examples.
        #         """
        #     },
        #     { "role": "system", "name": "example_user", "content": example['non-leaf']['summaries']},
        #     { "role": "system", "name": "example_system", "content": example['non-leaf']['topic']},
        #     { "role": "user", "content": query}
        # ]

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
        topic = request_chatgpt_gpt4(messages)
        return topic
    else:
        return

def add_hierarchical_topic(hierarchy, partitions, hyperedge_dict, topic_dict, filepath, sampleFlag=True):
    dfs(hierarchy, partitions, hyperedge_dict, topic_dict, filepath, sampleFlag)
    return topic_dict

def dfs(hierarchy, partitions, hyperedge_dict, topic_dict, filepath, sampleFlag=True):
    level = int(hierarchy['key'].split('-')[1])
    if level == 1: # at level 1, use the children (leaf nodes) to generate a topic
        # collect the leaf node summaries
        children_labels = list(map(lambda x: x['key'], hierarchy['children']))
        articles = clusterLabelToNodes(children_labels, partitions[0], hyperedge_dict)
        # entities = clusterLabelToNodes(children_labels, partitions[0], hyperedge_dict)
        # entity
        # entity_titles = [entity['title'] for entity in entities]
        if hierarchy['key'] in topic_dict: return # if already have a topic, skip. This happens when continuing from a break point

        # generate the topic
        gpt_topic = query_leaf_topic(articles, node_type='article')
        # print(entity_titles)
        # gpt_topic = query_leaf_topic(entity_titles, node_type='entity')
        # record the result
        topic_dict[hierarchy['key']] = gpt_topic
        save_json(topic_dict, filepath)
        print(hierarchy['key'], gpt_topic)
        return
    else:
        sub_topic_samples = [] # samples from the sub-topics
        all_articles = []
        # standard dfs
        for child in hierarchy['children']:
            dfs(child, partitions, hyperedge_dict, topic_dict, filepath, sampleFlag)
            # sample from the sub-topics
            level = int(child['key'].split('-')[1])
            articles = clusterLabelToNodes([child['key']], partitions[level], hyperedge_dict)
            # entities = clusterLabelToNodes([child['key']], partitions[level], hyperedge_dict)
            if sampleFlag:
                sample = articles[0]
                sub_topic_samples.append(sample)
            all_articles += articles
        if hierarchy['key'] in topic_dict: return # if already have a topic, skip. This happens when continuing from a break point
        # use the sub-topics and samples to generate a topic for the current node
        # article
        cluster_subtopics = [topic_dict[child['key']] for child in hierarchy['children']]

        # entity
        # cluster_subtopics = [topic_dict[child['key']].split(",") for child in hierarchy['children']]
        # cluster_subtopics = [item.strip() for sublist in cluster_subtopics for item in sublist] # flatten
        if sampleFlag:
            sample_articles = random.sample(all_articles, min(10, len(all_articles)))
        # generate the topic
        # article
        gpt_topic = query_cluster_topic(cluster_subtopics, sample_articles, node_type='article')
        # entity
        # gpt_topic = query_leaf_topic(cluster_subtopics, node_type='entity')
        # record the result
        topic_dict[hierarchy['key']] = gpt_topic
        save_json(topic_dict, filepath)
        print(hierarchy['key'], gpt_topic)
        return
    

if __name__ == "__main__":
    import json
    # 1. Read in hierarchy and partition
    # entity
    # hierarchy = json.load(open('data/result/AllTheNews/network/server/ravasz_hierarchies_entity.json'))
    # partitions = json.load(open('data/result/AllTheNews/network/server/ravasz_partitions_entity.json'))
    # hierarchy = json.load(open('data/result/VisPub/network/server/ravasz_hierarchies_entity.json'))
    # partitions = json.load(open('data/result/VisPub/network/server/ravasz_partitions_entity.json'))
    # article
    # hierarchy = json.load(open('data/result/AllTheNews/network/server/ravasz_hierarchies_article.json'))
    # partitions = json.load(open('data/result/AllTheNews/network/server/ravasz_partitions_article.json'))
    hierarchy = json.load(open('ravasz_hierarchies_article.json'))
    partitions = json.load(open('ravasz_partitions_article.json'))

    # 2. Read in entities. 
    # entities_dict = json.load(open('data/result/AllTheNews/network/entities.json'))
    # entities_dict = json.load(open('data/result/VisPub/network/entities.json'))
    # hyperedges_dict = json.load(open('data/result/AllTheNews/network/hyperedges.json')) # the original line
    articles_dict = json.load(open('articles.json')) # the original line

    # 3. generate topic. hierarchical_topics.json should be empty at first
    # entity
    # topic_dict = json.load(open('data/result/AllTheNews/hierarchical_topics_entities_raw.json'))
    topic_dict = json.load(open('hierarchical_topics_articles.json'))
    # topic_dict = json.load(open('data/result/VisPub/hierarchical_topics_entities.json'))
    # breakpoint_filepath = 'data/result/AllTheNews/hierarchical_topics_entities_raw.json'
    breakpoint_filepath = 'hierarchical_topics_articles.json'
    # breakpoint_filepath = 'data/result/VisPub/hierarchical_topics_entities.json'

    # article
    # topic_dict = json.load(open('data/result/AllTheNews/hierarchical_topics_articles.json'))
    # topic_dict = add_hierarchical_topic(hierarchy, par, hyperedges_dict, topic_dict)

    # execute
    topic_dict = add_hierarchical_topic(hierarchy, partitions, articles_dict, topic_dict, breakpoint_filepath, sampleFlag=True)
    # topic_dict = add_hierarchical_topic(hierarchy, partitions, entities_dict, topic_dict, breakpoint_filepath, sampleFlag=False)
