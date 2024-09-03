import json
from pprint import pprint
from refined.inference.processor import Refined
import time


def save_json(data, filepath=r"new_data.json"):
    with open(filepath, "w") as fp:
        json.dump(data, fp, indent=4, ensure_ascii=False)


def merge_sentences(sentences):
    sentence_list = [
        " ".join(sentence_word_list) for sentence_word_list in sentences
    ]  # merge the words into sentences
    paragraph = " ".join(sentence_list)
    return paragraph


def prepare_events(datum):
    # words_flattened = [word for sentence in datum['sentences'] for word in sentence]
    event = datum["events"]
    # trigger = event['trigger']
    participants = event["participants"]
    participants_obj = [
        {
            "entity_id": participant,
            "entity_word": participant,
        }
        for participant in participants
    ]
    event["participants"] = participants_obj
    return datum["events"]


def link_entities(refined, event, paragraph):
    spans = refined.process_text(paragraph)
    for span in spans:
        entity_word = span.text
        for participant in event["participants"]:
            if participant["entity_word"] == entity_word:
                if (
                    span.predicted_entity != None
                    and span.predicted_entity.wikidata_entity_id != None
                ):
                    entity_id = span.predicted_entity.wikidata_entity_id
                    entity_title = span.predicted_entity.wikipedia_entity_title
                    participant["entity_id"] = entity_id
                    participant["entity_title"] = entity_title
                participant["entity_type"] = span.coarse_mention_type
    return event


def transform_dataset(refined, dataset):
    transformed_dataset = {}
    for index, datum in enumerate(dataset):
        print("{}/{}".format(index, len(dataset)))
        events = prepare_events(datum)
        events = link_entities(refined, events, datum["summary"])
        if events == []:
            continue
        doc_key = datum["id"]
        if doc_key not in transformed_dataset.keys():
            transformed_dataset[doc_key] = {
                "doc_id": doc_key,
                "title": datum["title"],
                "url": datum["url"],
                "publication": datum["publication"],
                "author": datum["author"],
                "date": datum["date"],
                "content": datum["content"],
                "summary": datum["summary"],
                "events": [],
            }
        transformed_dataset[doc_key]["events"] = events
    return list(transformed_dataset.values())


def main():
    import os

    project_dir = os.path.dirname(os.path.abspath(__file__))
    relative_path = lambda x: os.path.join(project_dir, x)
    start_time = time.time()
    refined = Refined.from_pretrained(
        model_name="wikipedia_model_with_numbers", entity_set="wikipedia"
    )
    # All the News
    AllTheNews = json.load(open(relative_path("data/result/keywords/articles.json")))
    # AllTheNews = AllTheNews[:10]
    print("disambiguating keywords...")
    transformed_dataset = transform_dataset(refined, AllTheNews)
    save_json(
        transformed_dataset,
        relative_path("data/result/linked/articles_w_keywords.json"),
    )
    # transformed_dataset = json.load(open('data/result/linked/articles_w_keywords.json'))
    print("creating disambiguation dictionary...")
    # collect disambiguated keywords
    disambiguated_keywords = {}
    for article in transformed_dataset:
        event = article["events"]
        for participant in event["participants"]:
            entity_id = participant["entity_id"]
            entity_word = participant["entity_word"]
            if entity_word in disambiguated_keywords and entity_id == entity_word:
                continue
            disambiguated_keywords[entity_word] = entity_id
    save_json(
        disambiguated_keywords,
        relative_path("data/result/keywords/disambiguated_keywords.json"),
    )

    print("rewriting keyword embedding mappings...")
    # rewrite keyword_explanations_embeddings:
    keyword_explanations_embeddings = json.load(
        open("data/result/server/keyword_explanations_embeddings.json")
    )
    new_keyword_explanations_embeddings = {}
    for keyword, keyword_embedding_data in keyword_explanations_embeddings.items():
        if keyword not in disambiguated_keywords:
            continue
        entity_id = disambiguated_keywords[keyword]
        if entity_id not in new_keyword_explanations_embeddings:
            new_keyword_explanations_embeddings[entity_id] = keyword_embedding_data
    save_json(
        new_keyword_explanations_embeddings,
        relative_path("data/result/server/keyword_explanations_embeddings.json"),
    )
    end_time = time.time()
    print("execution time: ", end_time - start_time, " seconds")


if __name__ == "__main__":
    main()
