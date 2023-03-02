import pandas as pd
from sklearn.metrics.pairwise import cosine_similarity

def size_cost(new_dialogue, pool, alpha):
    return (1 - alpha * (pool - new_dialogue).abs())

def content_cost(df1, df2):
    # combine dfs
    tfi_df = pd.concat([df2, df1], axis=0).fillna(0.0)
    # measure cosine similarity 
    return pd.Series(cosine_similarity(tfi_df.iloc[[0]], tfi_df.iloc[1:])[0], index=df1.index)
    
def score_func(size, content, w_s, w_c, shot_count):
    score = w_s * size + w_c * content
    bests = score.nlargest(shot_count).index
    return bests
