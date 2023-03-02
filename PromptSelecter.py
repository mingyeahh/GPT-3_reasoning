# Imports
import json
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from numpy.linalg import norm
import pandas as pd
import re
from score import *

alpha = 0.005
w_s = 0.2
w_c = 0.8

##############
# Data loading
##############
# Turn json into a dataframe for easier data cleaning
with open("corpus/train.json") as f:
    s = f.read()
    data1 = json.loads(s)
df1 = pd.DataFrame.from_dict(data1)

with open("corpus/test.json") as f:
    s = f.read()
    data2 = json.loads(s)
df2 = pd.DataFrame.from_dict(data2)

with open("corpus/val.json") as f:
    s = f.read()
    data3 = json.loads(s)
df3 = pd.DataFrame.from_dict(data3)

df = pd.concat([df1, df2, df3])

############################
# get people in the dialogue
############################
def get_people(txt):
    names = re.findall(r"(?:^|\n)(\w+):", txt, re.MULTILINE)
    people = list(set(names))
    return people
df['people'] = df['dialogue'].map(get_people)

# Filter out data that is not equal to 2-people conversation
df1 = df.loc[df['people'].str.len() == 2].copy()

# reset index
df1.set_index(df1['id'], inplace=True)

#########################
# Get TFIDF for each word
#########################
names = [n.lower() for n in set.union(*[set(p) for p in df1['people']])]
vectorizer = TfidfVectorizer(ngram_range = (1, 1), token_pattern = r"\b((?:[A-Za-z]{2,}|I)(?:'[A-Za-z]+)?)\b", stop_words = names, norm='l1')
tfidf1 = vectorizer.fit_transform(df1['dialogue'])
scores = tfidf1.toarray()
tfi_df1 = pd.DataFrame(scores, columns=vectorizer.get_feature_names_out(), index=df1['id'])
# tfi_df

###########################
# Get size of the diaglogue, names not included
###########################
def get_size(txt):
    tokens = re.findall(r"\b((?:[A-Za-z]{2,}|I)(?:'[A-Za-z]+)?)\b", txt, re.MULTILINE)
    names = set(re.findall(r"(?:^|\n)(\w+):", txt, re.MULTILINE))
    return len([i for i in tokens if i not in names])
    
# Size of the diaglogue, names not included
df1['size'] = df1['dialogue'].map(get_size)

# print('loaded things', flush=True)



while True:
    raw = input()


    a = {"payload": 'javascript yo hey!'}
    id,json_str = raw.split(',',1)
    body = json.loads(json_str)

    raw_dialogue = body['batch']
    dialogue = []
    for i in raw_dialogue:
        dialogue.append(i['msg'])
    dialogue_string = " ".join(dialogue)
    vectorizer2 = TfidfVectorizer(ngram_range = (1, 1), token_pattern = r"\b((?:[A-Za-z]{2,}|I)(?:'[A-Za-z]+)?)\b", norm='l1')
    tfidf2 = vectorizer2.fit_transform(np.array([dialogue_string]))
    scores2 = tfidf2.toarray()
    tfi_df2 = pd.DataFrame(scores2, columns=vectorizer2.get_feature_names_out(), index=[0])

    # combine dfs using 
    tfi_df = pd.concat([tfi_df2, tfi_df1], axis=0).fillna(0.0)

    # measure cosine similarity using 
    similarity_score = content_cost(tfi_df1, tfi_df2)

    # get sizes
    size2 = get_size(dialogue_string)
    size_score = size_cost(size2, df1['size'], alpha)

    # Indexes of the best shots
    best_idxs = score_func(size_score, similarity_score, w_s, w_c, body['shots_count'])

    shots = df1.loc[best_idxs, ['summary', 'dialogue']]
    
    shots_to_js = shots.to_json(orient='records')

    print(f"{id},{shots_to_js}", flush=True)

