const inp = document.getElementById("HumanInput");
const frm = document.getElementById("HumanForm");

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
            return res.json();
        } else {
            console.error(res.body);
            throw new Error();
        }
    }).then(data => {
        console.log(data);
    }).catch(console.error);
});