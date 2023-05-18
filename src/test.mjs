import si from 'systeminformation';
const tempratureCheckIntervall = 5000

function checkCpuTemprature() {
    si.cpuTemperature().then((result) => {
        if (result) {
            const mainTemp = result.main;
            console.log(mainTemp);
        }
    })
}

checkCpuTemprature();
setInterval(checkCpuTemprature, tempratureCheckIntervall);