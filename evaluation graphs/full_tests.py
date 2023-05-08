import matplotlib
import matplotlib.pyplot as plt

matplotlib.use("Agg")

data = [
    ## BASELINE ##
    [3, 3, 3, 3, 3], # Reasoning
    [4, 2, 4, 4, 3], # Diversity
    [2, 5, 2, 2, 2], # Task Completion
    [3, 3, 4, 5, 5], # Fluency

    ## MODEL 1 ##
    [4, 3, 4, 3, 4], # Reasoning
    [3, 4, 5, 4, 5], # Diversity
    [3, 2, 3, 2, 3], # Task Completion
    [4, 3, 5, 5, 5], # Fluency

    ## MODEL 2 ##
    [4, 4, 4, 3, 3], # Reasoning
    [5, 5, 5, 4, 2], # Diversity
    [3, 3, 3, 2, 3], # Task Completion
    [5, 5, 5, 5, 5], # Fluency
]

temps = [0, 0.2, 0.4, 0.6, 0.8]

fg, ax = plt.subplots()
plt.title("No summariser")
plt.xlabel("Temperature")
plt.ylabel("Score")
plt.ylim(-0.3,5.3)
plt.plot(temps, data[0], 'b-', label="Reasoning")
plt.plot(temps, data[1], 'g--', label="Diversity")
plt.plot(temps, data[2], 'r:', label="Task Completion")
plt.plot(temps, data[3], 'm-.', label="Fluency")

plt.savefig("base_full_test.png")
plt.clf()

fg, ax = plt.subplots()
plt.title("Chunk summariser")
plt.xlabel("Temperature")
plt.ylim(-0.3,5.3)
plt.plot(temps, data[4], 'b-', label="Reasoning")
plt.plot(temps, data[5], 'g--', label="Diversity")
plt.plot(temps, data[6], 'r:', label="Task Completion")
plt.plot(temps, data[7], 'm-.', label="Fluency")
plt.legend(loc="lower right")
ax.tick_params(labelleft=False)

plt.savefig("chunk_full_test.png")
plt.clf()

fg, ax = plt.subplots()
plt.title("Hierarchical summariser")
plt.xlabel("Temperature")
plt.ylim(-0.3,5.3)
plt.plot(temps, data[8], 'b-', label="Reasoning")
plt.plot(temps, data[9], 'g--', label="Diversity")
plt.plot(temps, data[10], 'r:', label="Task Completion")
plt.plot(temps, data[11], 'm-.', label="Fluency")
ax.tick_params(labelleft=False)

plt.savefig("hier_full_test.png")
plt.clf()
