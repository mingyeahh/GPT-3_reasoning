import matplotlib
import matplotlib.pyplot as plt

matplotlib.use("Agg")

data = [
    ## MODEL 1 ##
    [4.667, 4.5, 4.5, 5, 4.5], # Fact
    [4.333, 4.667, 4.833, 4.333, 4.5], # Faith
    [4.167, 4.5, 4.667, 4.5, 4.833], # Conc
    [4.167, 4.833, 5, 4.667, 4.5], # Cov

    ## MODEL 2 ##
    [4.17, 3.50, 4.17, 4.67, 4.67], # Fact
    [4.50, 4.50, 4.67, 4.67, 4.33], # Faith
    [4.00, 4.67, 4.67, 5.00, 4.67], # Conc
    [4.83, 5.00, 4.50, 5.00, 4.17], # Cov
]

temps = [0, 0.1, 0.2, 0.5, 0.7]

plt.title("Chunk summariser")
plt.xlabel("Temperature")
plt.ylabel("Score")
plt.ylim(3.4,5.1)
plt.plot(temps, data[0], 'b-', label="Factuality")
plt.plot(temps, data[1], 'g--', label="Faithfulness")
plt.plot(temps, data[2], 'r:', label="Conciseness")
plt.plot(temps, data[3], 'm-.', label="Coverage")
plt.legend(loc="lower right")

plt.savefig("chunk_summ_test.png")
plt.clf()

plt.title("Hierarchical summariser")
plt.xlabel("Temperature")
plt.ylabel("Score")
plt.ylim(3.4,5.1)
plt.plot(temps, data[4], 'b-', label="Factuality")
plt.plot(temps, data[5], 'g--', label="Faithfulness")
plt.plot(temps, data[6], 'r:', label="Conciseness")
plt.plot(temps, data[7], 'm-.', label="Coverage")
plt.legend(loc="lower right")

plt.savefig("hier_summ_test.png")
plt.clf()
