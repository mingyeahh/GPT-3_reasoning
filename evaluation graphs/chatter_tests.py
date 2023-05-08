import matplotlib
import matplotlib.pyplot as plt
import numpy as np

matplotlib.use("Agg")
np.random.seed(3)

data = np.array([
    ## MODEL 1 ##
    [4.5,4.5,4.5,4.5,4.5,4.5,4.5,4.5,4.5],
    [1, 2, 3, 4, 5, 5, 5, 3, 5],
    [1, 3, 4, 2, 2, 3, 3, 2, 4],

    ## MODEL 2 ##
    [4.5,4.5,4.5,4.5,4.5,4.5,4.5,4.5,4.5],
    [5,5,5,5,5,5,5,5,5],
    [5,3,4,5,5,4,3,3,4],

    ## BASELINE ##
    [0,0,0,0,0,0,0,0,0],
    [5, 4, 3, 5, 5, 5, 2, 2, 3],
    [1, 5, 2, 3, 3, 2, 2, 2, 2],
])

temps = np.array([0,0.5,1,0,0.5,1,0,0.5,1])

avgs = np.stack([data[:,temps==t].mean(axis=1) for t in [0,0.5,1]], axis=1)

# Jittered version of data and temps, but it's funnier to image data made of denim
jata = data + np.random.normal(0, 0.05, data.shape)
jemps = temps + np.random.normal(0, 0.01, temps.shape)


# The goal is to try and combine these figures into subplots of one figure, such that they share a y axis and a legend and generally look nice. I'll also need to make sure the y dimension is consistent because it's not right now
# Plan b is take the y axis and legends off some of them and stitch it together so it *looks* like I did that
fg, ax = plt.subplots()
plt.title("Chunk summariser")
plt.xlabel("Temperature")
plt.ylim(-0.3,5.3)
plt.plot(jemps, jata[0], 'b+', label="Comprehension")
plt.plot(jemps, jata[1], 'g*', label="Requested Diversity")
plt.plot(jemps, jata[2], 'rx', label="Prompted Diversity")
plt.plot(temps[:3], avgs[0], 'b-')
plt.plot(temps[:3], avgs[1], 'g--')
plt.plot(temps[:3], avgs[2], 'r:')
plt.legend(loc="lower right")
ax.tick_params(labelleft=False)

plt.savefig("chunk_chat_test.png")
plt.clf()

fg, ax = plt.subplots()
plt.title("Hierarchical summariser")
plt.xlabel("Temperature")
plt.ylim(-0.3,5.3)
plt.plot(jemps, jata[3], 'b+', label="Comprehension")
plt.plot(jemps, jata[4], 'g*', label="Requested Diversity")
plt.plot(jemps, jata[5], 'rx', label="Prompted Diversity")
plt.plot(temps[:3], avgs[3], 'b-')
plt.plot(temps[:3], avgs[4], 'g--')
plt.plot(temps[:3], avgs[5], 'r:')
ax.tick_params(labelleft=False)

plt.savefig("hier_chat_test.png")
plt.clf()

fg, ax = plt.subplots()
plt.title("No summariser")
plt.xlabel("Temperature")
plt.ylabel("Score")
plt.ylim(-0.3,5.3)
plt.plot(jemps, jata[6], 'b+', label="Comprehension")
plt.plot(jemps, jata[7], 'g*', label="Requested Diversity")
plt.plot(jemps, jata[8], 'rx', label="Prompted Diversity")
plt.plot(temps[:3], avgs[6], 'b-')
plt.plot(temps[:3], avgs[7], 'g--')
plt.plot(temps[:3], avgs[8], 'r:')

plt.savefig("base_chat_test.png")
plt.clf()
