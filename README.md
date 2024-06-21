# HINTs 
This is the open source repository for paper `HINTs: Sensemaking on large collections of documents with Hypergraph visualization and INTelligent agents`: https://arxiv.org/abs/2403.02752

## Overview
<img src="./docs/overview.png"/>
Overview of the HINTs system.

(a) The peripheral area of Cluster View shows the mentioned keywords of highlighted documents using Gilbert curves. 

(b) The center area of Cluster View shows the topic structure of the corpus using Gosper curves. 

(c) The Document View shows a list of selected documents. 

(d) The Chatbot View provides a chatbot interface to answer user questions with the option to insert selected documents in the prompt.

### Interactions
1. `Click`: left click on a cluster to expand it
2. `Cmd` (mac) or `Ctrl` (windows): Hover over a cluster, then hold `Cmd` or `Ctrl` to temporarily expand a cluster to see its sub clusters
3. `Zoom`: Default by mouse wheels or gestures on trackpads
4. `Pan`: Drag on empty spaces in the layout to pan

# Reproduce
The reproducing step can be divided into `data processing` and `launching the server`. 
We provide preprocessed data so that interested individuals can skip the `data processing` step, which can be downloaded via this [Link](https://drive.google.com/drive/folders/1WWzuq3KAffNUbqLNxjEzUeVd-RVvLTCd?usp=sharing).
## Where to put the data
After downloading, decompress and put the data under the `server` directory. You should see `server/data/VisPub` and `server/data/AllTheNews`

If you wish to reproduce the `data processing` step, follow the instructions under [Reproducing the data processing stage](#reproducing-the-data-processing-stage)
## Launching the backend server
The backend server is implemented with Flask. 
In addition, the server needs an [OpenAI api key](https://platform.openai.com/api-keys).
Follow these steps to set up the required environments.

1. Navigate to `server` directory.
2. Create a file called `openai_api_key` under the `server` directory, and copy and paste the api key from OpenAI's website.
3. Set up the python environment with:
```shell
# typical
pip install -r requirements.txt
# or sometimes on Mac
python3 -m pip install -r requirements.txt
```
4. Make sure the data files are present (see Where to put the data (link))
5. run `flask run`
6. The server should be up and listening to `localhost:5000`. It might take 3-5 minutes to start the server.

## Launching the frontend
The frontend is implemented with `vite.js` and `svelte.js`
To launch, navigate to `frontend-svelte` and run:
```shell
npm i
npm run dev
```
The frontend should be up and listening to `localhost:5173`.


## Reproducing the data processing stage
Reproduction on the `AllTheNews` and `VisPub` dataset can be done under the `reproduce` directory.
The directory is organized as follows:
1. `Summarization`, `Keyword Extraction`, `Keyword Disambiguation`, and `Embedding Generation`, and `Hypergraph Construction` are done with separate prompts for different datasets, so they are separated in `reproduce/AllTheNews` and `reproduce/VisPub`
2. For `Hierarchical Clustering` and `Topic Label Generation`, the two datasets use the same algorithm, so they are under `reproduce/clustering.py` and `reproduce/hierarchical_topics.py`.

Follow these steps to reproduce (using VisPub as an example):
1. Download the raw dataset from this
<a href="https://drive.google.com/drive/folders/1rEYbapjp4Yk1xKaiMnrZ_Re_EsQ1nCMg?usp=sharing" target="_blank">link</a>

2. Decompress and put The raw datasets for `VisPub` should be put under `reproduce`: you should see `reproduce/VisPub/data/raw/`. (or `reproduce/AllTheNews/data/` for `AllTheNews`)
3. The data processing needs an [OpenAI api key](https://platform.openai.com/api-keys). Request one from OpenAI, create a file called `openai_api_key` under `reproduce` and copy and paste the key from OpenAI's website.
3. Navigate to `reproduce/VisPub/`, and run `bash execute_pipeline.sh`. 
4. Once finished, copy the files under `reproduce/VisPub/data/result/server/` to `server/data/VisPub/`
5. Then navigate back to `reproduce` for clustering and hierarchical topic generation.
6. Run the following commands
```shell
# process articles on VisPub 
python3 clustering.py -dataset VisPub -data_type article
python3 hierarchical_topics.py -dataset VisPub -data_type article
# process entities (keywords) on VisPub 
python3 clustering.py -dataset VisPub -data_type entity
python3 hierarchical_topics.py -dataset VisPub -data_type entity
``` 
7. Once finished, copy the json files under `reproduce/VisPub/data/result/server/` to `server/data/VisPub/`.
5. Follow the [instructions for launching the backend server](#launching-the-backend-server) to launch the server.