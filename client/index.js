const frm1 = document.getElementById("HumanForm1");
const frm2 = document.getElementById("HumanForm2");
// const frm3 = document.getElementById("HumanForm3");
const frm4 = document.getElementById("HumanForm4");

const sum1 = document.getElementById("model1-sum");
const sum2 = document.getElementById("model2-sum");
let sum_panes = {1: sum1, 2: sum2, 4: null};
let sum_counters = {1: -1, 2: -1, 4: -1};

const tc = document.getElementById("turn-counter");
const tcb = document.getElementById("turn-btn");
let activeModel = 1;

const models = [1,2,4];
let model_counters = {1: 0, 2: 0, 4: 0};

// Keeping track of the active model
let pills = document.querySelectorAll('button[data-bs-toggle="pill"]');
for (let p of pills) {
    p.addEventListener('shown.bs.tab', (e) => {
        let modelNumber = e.target.getAttribute('data-modelNo');
        activeModel = modelNumber;
        tc.innerText = model_counters[modelNumber];
        tcb.classList.remove('btn-outline-danger');
        tcb.classList.add('btn-outline-primary');
    })
}

const formHandler = (e) => {
    e.preventDefault();

    // e.currentTarget => the form being submitted
    // that.elements => list of the inputs in the form
    // that[0].value => value of the first input in the form
    let frm = e.currentTarget
    let hinp = frm.elements[0].value;

    let modelNumber = frm.getAttribute("data-modelNo");

    if (hinp.length == 0) {
        console.error("No data");
        throw new Error("No data");
    }

    let data = {
        "msg": hinp,
    };

    fetch(`send?model=${modelNumber}`, {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json',
        },
    }).then((res) => {
        if (res.ok) {
            // console.log(`current target is ${frm}`);
            frm.reset();
            return res.json();
        } else {
            console.error(res.body);
            throw new Error();
        }
    }).then(data => {
        console.log(data);
        let elem = document.getElementById(`conv-model${modelNumber}`);

        elem.innerHTML += `<span class="title">Human:</span> <span id="${modelNumber}-${model_counters[modelNumber]}" style="color: darkblue">${hinp.replace(/(?:\r\n|\r|\n)/g, '<br>')}</span>
        <br>`;
        model_counters[modelNumber]++;

        if (data.cutoff[0] !== -1) {
            let messageID = `${modelNumber}-${model_counters[modelNumber] - data.cutoff[0]}`;
            let cutoffPoint = document.getElementById(messageID);
            let previousText = cutoffPoint.innerHTML;
            previousText = previousText.replace(/(?:<span class="[^"]+">|<\/span>)/g, '').replace(/<br>/g, '\n');
            let markers = document.getElementsByClassName(`marker-${modelNumber}`)
            for (let i of markers) {
                // console.log(i);
                i.classList.add("hidden");
            }
            let newText = previousText.slice(0,data.cutoff[1]) + `<span class="marker-${modelNumber}">` + previousText.slice(data.cutoff[1]) + '</span>';
            cutoffPoint.innerHTML = newText.replace(/(?:\r\n|\r|\n)/g, '<br>');
        }

        if (data.sum.count > sum_counters[modelNumber]) {
            sum_counters[modelNumber]++;
            let newP = `<p class="summary"><span class="title">Batch ${sum_counters[modelNumber]+1} Summary</span><br>${data.sum.summary}</p>`;
            sum_panes[modelNumber].innerHTML += newP;
        };

        elem.innerHTML += `<span class="title">AI:</span> <span id="${modelNumber}-${model_counters[modelNumber]}">${data.text.replace(/(?:\r\n|\r|\n)/g, '<br>')}</span>
        <br>`;
        model_counters[modelNumber]++;
        if (modelNumber == activeModel) {
            tc.innerText = model_counters[modelNumber];
            if (data.cutoff[0] == -1 && data.cutoff[1] == -1) {
                tcb.classList.remove('btn-outline-danger');
                tcb.classList.add('btn-outline-primary');
            } else {
                tcb.classList.remove('btn-outline-primary');
                tcb.classList.add('btn-outline-danger')
            }
        }
        elem.scrollTop = elem.scrollHeight;
    }).catch(console.error);
};

// Post human input to backend, to be proccessed by GPT-3 
frm1.addEventListener("submit", formHandler);
frm2.addEventListener("submit", formHandler);
// frm3.addEventListener("submit", formHandler);
frm4.addEventListener("submit", formHandler);

// Get history data to show on the front end
// This is for when the front end load
window.addEventListener("load", (e) => {
    e.preventDefault();

    models.forEach((m) => {
        fetch(`history?model=${m}`, {
            method: "GET",
        }).then((res) => {
            if (res.ok) {
                return res.json();
            } else {
                console.error(res.body);
                throw new Error();
            }
        }).then(data => {
            let history = data.hist;
            let summaries = data.sum;
            // console.log(data);
            // document.getElementById('conv-model1').innerHTML = '';
            history.forEach((i) =>{
                let newLine = `<span class="title">${i.sender ==="user" ? "Human" : "AI"}:</span> <span id="${m}-${model_counters[m]}">${i.msg.replace(/(?:\r\n|\r|\n)/g, '<br>')}</span>
                            <br>`;
                model_counters[m]++;
                let elem = document.getElementById(`conv-model${m}`)
                elem.innerHTML += newLine;
                elem.scrollTop = elem.scrollHeight;
                // console.log(model_counters[m])
            });

            summaries.forEach((i) => {
                sum_counters[m]++;
                let newP = `<p class="summary"><span class="title">Batch ${sum_counters[m]+1} Summary</span><br>${i}</p>`;
                sum_panes[m].innerHTML += newP;
            });

            if (m == activeModel) tc.innerText = model_counters[m];
        }).catch(console.error);
    })
});