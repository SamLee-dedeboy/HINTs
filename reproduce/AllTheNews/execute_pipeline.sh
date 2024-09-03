mkdir -p data/result/keywords
mkdir -p data/result/summaries
mkdir -p data/result/server
python3 summarize_and_extract_events.py
mkdir -p data/result/linked
python3 process_keywords_AllTheNews.py
mkdir -p data/result/network
python3 construct_network_AllTheNews.py