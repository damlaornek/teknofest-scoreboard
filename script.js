async function getScores(){

let response = await fetch("http://127.0.0.1:5000/scores")

let data = await response.json()

let table = document.querySelector("#scoreTable tbody")

table.innerHTML=""

data.forEach(team => {

let row = `
<tr>
<td>${team.team}</td>
<td>${team.mission}</td>
<td>${team.score}</td>
<td>${team.status}</td>
</tr>
`

table.innerHTML += row

})

}

setInterval(getScores,3000)