const frm1 = document.getElementById("HumanForm1");
const frm2 = document.getElementById("HumanForm2");
// const frm3 = document.getElementById("HumanForm3");
const frm4 = document.getElementById("HumanForm4");

const tc = document.getElementById("turn-counter");
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
        // console.log(data);
        let elem = document.getElementById(`conv-model${modelNumber}`);

        elem.innerHTML += `<span class="title">Human:</span> <span id="${modelNumber}-${model_counters[modelNumber]}">${hinp}</span>
        <br>`;
        model_counters[modelNumber]++;

        if (data.cutoff[0] !== -1) {
            let messageID = `${modelNumber}-${model_counters[modelNumber] - data.cutoff[0]}`;
            let cutoffPoint = document.getElementById(messageID);
            let previousText = cutoffPoint.innerHTML;
            let markers = document.getElementsByClassName(`marker-${modelNumber}`)
            for (let i of markers) {
                // console.log(i);
                i.classList.add("hidden");
            }
            cutoffPoint.innerHTML = previousText.slice(0,data.cutoff[1]) + `<span class="marker-${modelNumber}">` + previousText.slice(data.cutoff[1]) + '</span>';
        }

        elem.innerHTML += `<span class="title">AI:</span> <span id="${modelNumber}-${model_counters[modelNumber]}">${data.text}</span>
        <br>`;
        model_counters[modelNumber]++;
        if (modelNumber === activeModel) tc.innerText = model_counters[modelNumber];
        elem.scrollTop = elem.scrollHeight;
    }).catch(console.error);
};

// Post human input to backend, to be proccessed by GPT-3 
frm1.addEventListener("submit", formHandler);
frm2.addEventListener("submit", formHandler);
// frm3.addEventListener("submit", formHandler);
frm4.addEventListener("submit", formHandler);

// Get history data to show on the front end
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
            // console.log(data);
            // document.getElementById('conv-model1').innerHTML = '';
            data.forEach((i) =>{
                let newLine = `<span class="title">${i.sender ==="user" ? "Human" : "AI"}:</span> <span id="${m}-${model_counters[m]}">${i.msg}</span>
                            <br>`;
                model_counters[m]++;
                let elem = document.getElementById(`conv-model${m}`)
                elem.innerHTML += newLine;
                elem.scrollTop = elem.scrollHeight;
                // console.log(model_counters[m])
                if (m === activeModel) tc.innerText = model_counters[m];
            });
        }).catch(console.error);
    })
});