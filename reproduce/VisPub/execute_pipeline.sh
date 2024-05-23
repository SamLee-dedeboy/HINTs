mkdir -p data/result/keywords
mkdir -p data/result/linked
mkdir -p data/result/server
python3 process_keywords_VisPub.py 
mkdir -p data/result/network
python3 construct_network_VisPub.py