const inp = document.getElementById("HumanInput");
const frm = document.getElementById("HumanForm");

// Post human input to backend, to be proccessed by GPT-3 
frm.addEventListener("submit", (e) => {
    e.preventDefault();

    let hinp = inp.value;

    if (hinp.length == 0) {
        console.error("No data");
        throw new Error("No data");
    }

    let data = {
        "msg": hinp,
    };

    fetch("send", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
            'Content-Type': 'application/json',
        },
    }).then((res) => {
        if (res.ok) {
            frm.reset();
            return res.json();
        } else {
            console.error(res.body);
            throw new Error();
        }
    }).then(data => {
        console.log(data);
        let newLine = `<span class="title">Human:</span> ${hinp}
                    <br><span class="title">AI:</span> ${data.text}
                    <br>`;
        document.getElementById('conv-model1').innerHTML += newLine;
    }).catch(console.error);
});

// Get history data to show on the front end
window.addEventListener("load", (e) => {
    e.preventDefault();

    fetch("history", {
        method: "GET",
    }).then((res) => {
        if (res.ok) {
            return res.json();
        } else {
            console.error(res.body);
            throw new Error();
        }
    }).then(data => {
        console.log(data);
        // document.getElementById('conv-model1').innerHTML = '';
        data.forEach((i) =>{
            let newLine = `<span class="title">${i.sender}:</span> ${i.msg}
                        <br>`;
            document.getElementById('conv-model1').innerHTML += newLine;
        });
    }).catch(console.error);
});