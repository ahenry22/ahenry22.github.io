const margin = { top: 60, right: 40, bottom: 60, left: 170 }
const width = 860 - margin.left - margin.right
const height = 420 - margin.top - margin.bottom
const minimumSampleSize = 30

let decidedAllegations = []

function init() {
    d3.csv("./data/allegations.csv", allegation => {
        const disposition = allegation.board_disposition
        const isDecided =
            disposition.startsWith("Substantiated") ||
            disposition.startsWith("Exonerated") ||
            disposition.startsWith("Unsubstantiated")

        if (!isDecided) return

        return {
            ethnicity: allegation.complainant_ethnicity || "Unknown",
            year: +allegation.year_received,
            substantiated: disposition.startsWith("Substantiated") ? 1 : 0
        }
    }).then(allegations => {
        decidedAllegations = allegations
        drawWhiteHatChart()
        drawBlackHatChart()
    })
}

function getSubstantiationRates(allegations) {
    const groups = d3.group(allegations, allegation => allegation.ethnicity)

    return Array.from(groups, ([ethnicity, group]) => ({
        ethnicity: ethnicity,
        rate: d3.mean(group, allegation => allegation.substantiated),
        count: group.length
    }))
}

function drawWhiteHatChart() {
    const yearRange = d3.extent(decidedAllegations, allegation => allegation.year)
    const chartData = getSubstantiationRates(decidedAllegations)
        .filter(row => row.count >= minimumSampleSize)
        .sort((a, b) => b.rate - a.rate)

    const svg = d3.select('#white')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`)

    const x = d3.scaleLinear()
        .domain([0, d3.max(chartData, row => row.rate) * 1.15])
        .range([0, width])
    const y = d3.scaleBand()
        .domain(chartData.map(row => row.ethnicity))
        .range([0, height])
        .padding(0.25)

    svg.append('text')
        .attr('x', -margin.left + 10).attr('y', -35)
        .style('font-size', '17px').style('font-weight', 'bold')
        .text('Share of decided NYPD complaint allegations that were substantiated')
    svg.append('text')
        .attr('x', -margin.left + 10).attr('y', -15)
        .style('font-size', '12px').style('fill', '#555')
        .text(`By complainant ethnicity, ${yearRange[0]}-${yearRange[1]}. Axis starts at 0%.`)

    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d3.format('.0%')))

    svg.selectAll('.bar')
        .data(chartData)
        .join('rect')
        .attr('class', 'bar')
        .attr('y', row => y(row.ethnicity))
        .attr('width', row => x(row.rate))
        .attr('height', y.bandwidth())
        .style('fill', '#2b6cb0')

    svg.selectAll('.name')
        .data(chartData)
        .join('text')
        .attr('class', 'name')
        .attr('x', -8)
        .attr('y', row => y(row.ethnicity) + y.bandwidth() / 2 + 4)
        .attr('text-anchor', 'end')
        .style('font-size', '12px')
        .text(row => `${row.ethnicity} (n=${row.count.toLocaleString()})`)

    svg.selectAll('.value')
        .data(chartData)
        .join('text')
        .attr('class', 'value')
        .attr('x', row => x(row.rate) + 5)
        .attr('y', row => y(row.ethnicity) + y.bandwidth() / 2 + 4)
        .style('font-size', '12px')
        .text(row => d3.format('.1%')(row.rate))
}

function drawBlackHatChart() {
    const yearRange = d3.extent(decidedAllegations, allegation => allegation.year)
    const excludedEthnicities = ['Unknown', 'Other Race', 'Refused']
    const recentAllegations = decidedAllegations.filter(allegation =>
        allegation.year >= yearRange[1] - 5 &&
        !excludedEthnicities.includes(allegation.ethnicity))

    const chartData = getSubstantiationRates(recentAllegations)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .sort((a, b) => b.rate - a.rate)

    const blackMargin = { top: 60, right: 40, bottom: 60, left: 70 }
    const blackWidth = 860 - blackMargin.left - blackMargin.right
    const blackHeight = 420 - blackMargin.top - blackMargin.bottom

    const svg = d3.select('#black')
        .append('svg')
        .attr('width', blackWidth + blackMargin.left + blackMargin.right)
        .attr('height', blackHeight + blackMargin.top + blackMargin.bottom)
        .append('g')
        .attr('transform', `translate(${blackMargin.left},${blackMargin.top})`)

    const yMinimum = Math.max(0, d3.min(chartData, row => row.rate) - 0.015)
    const yMaximum = d3.max(chartData, row => row.rate) + 0.01
    const x = d3.scaleBand()
        .domain(chartData.map(row => row.ethnicity))
        .range([0, blackWidth])
        .padding(0.35)
    const y = d3.scaleLinear()
        .domain([yMinimum, yMaximum])
        .range([blackHeight, 0])

    svg.append('text')
        .attr('x', -blackMargin.left + 10).attr('y', -35)
        .style('font-size', '17px').style('font-weight', 'bold')
        .text('Complaint system fails some New Yorkers: huge gaps in who gets justice')
    svg.append('text')
        .attr('x', -blackMargin.left + 10).attr('y', -15)
        .style('font-size', '12px').style('fill', '#555')
        .text('Substantiation rate of NYPD complaint allegations by complainant ethnicity')

    svg.append('g')
        .attr('class', 'axis')
        .call(d3.axisLeft(y).ticks(5).tickFormat(d3.format('.0%')).tickSize(-blackWidth))
        .call(group => group.selectAll('line').style('stroke', '#e5e5e5'))
        .call(group => group.select('.domain').remove())

    svg.append('g')
        .attr('class', 'axis')
        .attr('transform', `translate(0,${blackHeight})`)
        .call(d3.axisBottom(x).tickSize(0))

    svg.selectAll('.bar')
        .data(chartData)
        .join('rect')
        .attr('class', 'bar')
        .attr('x', row => x(row.ethnicity))
        .attr('width', x.bandwidth())
        .attr('y', row => y(row.rate))
        .attr('height', row => y(yMinimum) - y(row.rate))
        .style('fill', '#2b6cb0')

    svg.selectAll('.value')
        .data(chartData)
        .join('text')
        .attr('class', 'value')
        .attr('x', row => x(row.ethnicity) + x.bandwidth() / 2)
        .attr('y', row => y(row.rate) - 6)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .text(row => d3.format('.1%')(row.rate))
}

window.addEventListener('load', init)
