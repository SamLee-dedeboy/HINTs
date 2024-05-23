python3 process_keywords_VisPub.py --spans
python3 construct_network_VisPub.py
python3 clustering.py -dataset VisPub -data_type article
python3 hierarchical_topics -dataset VisPub -data_type article