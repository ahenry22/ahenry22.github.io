let allData = []
let xVar = 'access', yVar = 'success', sizeVar = 'count', minCount = 200
let xScale, yScale, sizeScale

const options = ['access', 'success', 'mobility', 'income', 'childIncome', 'count']

const t = 1000; // 1000ms = 1 second

// set margin
const margin = { top: 80, right: 60, bottom: 60, left: 100 };
const width = 800 - margin.left - margin.right;
const height = 600 - margin.top - margin.bottom;

// Create SVG
const svg = d3.select('#vis')
    .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

function init(){
    d3.csv("./data/mrc_table1.csv", d => {
        if (+d.super_opeid <= 0 || !d.state) return
        return {
            name: d.name, state: d.state,
            access: +d.par_q1, success: +d.kq5_cond_parq1, mobility: +d.mr_kq5_pq1,
            income: +d.par_median, childIncome: +d.k_median, count: +d.count
        }
    })
    .then(data => {
            console.log(data)
            allData = data
            setupSelector()
            
            // Initial rendering steps:
            // P.S. You could move these into setupSelector(), 
            // but calling them separately makes the flow clearer.
            updateAxes()
            updateVis()
        })
    .catch(error => console.error('Error loading data:', error));
}

// Here’s what each function is responsible for:

function setupSelector(){
  // Handles UI changes (sliders, dropdowns)
  // Anytime the user tweaks something, this function reacts.
  // May need to call updateAxes() and updateVis() here when needed!

  d3.select('#minSlider').on('input', function (){

    minCount = +this.value
    d3.select('#value-time').text(minCount)
    updateVis()

  })

  d3.selectAll('.variable')
   // loop over each dropdown button
    .each(function() {
        d3.select(this).selectAll('myOptions')
        .data(options)
        .enter()
        .append('option')
        .text(d => d) // The displayed text
        .attr("value",d => d) // The actual value used in the code
    })
    .on("change", function (event) {
        // YOUR TURN: if/else on d3.select(this).property("id"),
        // assigning d3.select(this).property("value") to xVar, yVar, or sizeVar
        if (d3.select(this).property("id") === "xVariable") {
            xVar = d3.select(this).property("value")
        } else if (d3.select(this).property("id") === "yVariable") {
            yVar = d3.select(this).property("value")
        } else if (d3.select(this).property("id") === "sizeVariable") {
            sizeVar = d3.select(this).property("value")
        }

        updateAxes();
        updateVis();
    })

  d3.select('#xVariable').property('value', xVar)
  d3.select('#yVariable').property('value', yVar)
  d3.select('#sizeVariable').property('value', sizeVar)
}

function updateAxes(){
  // Draws the x-axis and y-axis
  // Adds ticks, labels, and makes sure everything lines up nicely

  svg.selectAll('.axis').remove()
  svg.selectAll('.labels').remove()

  xScale = d3.scaleLinear()
      .domain([0, d3.max(allData, d => d[xVar])])
      .range([0, width]);
  const xAxis = d3.axisBottom(xScale)

  svg.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height})`) // Position at the bottom
      .call(xAxis);

  // Your turn: Create the y-axis using the same approach.
  // Use d3.scaleLinear() again.
  // Adjust .domain(), .range(), and the .attr("transform", ...) to position it on the left.

    yScale = d3.scaleLinear()
    .domain([0, d3.max(allData, d => d[yVar])])
    .range([height, 0])
    const yAxis = d3.axisLeft(yScale)

    svg.append("g")
        .attr("class", "axis")
        .call(yAxis);

  sizeScale = d3.scaleSqrt()
      .domain([0, d3.max(allData, d => d[sizeVar])]) // Largest bubble = largest data point 
      .range([5, 20]); // Feel free to tweak these values if you want bigger or smaller bubbles

  // X-axis label
  svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 20)
      .attr("text-anchor", "middle")
      .text(xVar) // Displays the current x-axis variable
      .attr('class', 'labels')

  // Y-axis label (rotated)
  svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -margin.left + 40)
      .attr("text-anchor", "middle")
      .text(yVar) // Displays the current y-axis variable
      .attr('class', 'labels')
}

function updateVis(){
// Draws (or updates) the bubbles
// Filter data for the current year
let currentData = allData.filter(d => d.count >= minCount)
    svg.selectAll('.points')
    .data(currentData, d => d.name)
    .join(
        // Enter: When new bubbles are added
        function (enter) {
            return enter
            .append('circle')
            .attr('class', 'points')
            .attr('cx', d => xScale(d[xVar]))
            .attr('cy', d => yScale(d[yVar]))
            .style('fill', 'slategray')
            .style('opacity', .5)
            .attr('r', 0)
            .on('mousemove', (e, d) => d3.select('#tooltip').style('display', 'block')
                .style('left', (e.pageX + 10) + 'px').style('top', (e.pageY + 10) + 'px')
                .html(`<b>${d.name}</b><br>${xVar}: ${d[xVar].toFixed(1)}<br>${yVar}: ${d[yVar].toFixed(1)}`))
            .on('mouseout', () => d3.select('#tooltip').style('display', 'none'))
            .transition(t)
            .attr('r', d => sizeScale(d[sizeVar]))
        },
            // Update: When existing bubbles need to move or resize
        function (update) {
            return update
            // Smoothly move to new positions/sizes
            .transition(t)
            .attr('cx', d => xScale(d[xVar]))
            .attr('cy', d => yScale(d[yVar]))
            .attr('r', d => sizeScale(d[sizeVar]))

        },
        // Exit: When bubbles need to be removed
        function (exit) {
            exit
            .transition(t)
            .attr('r', 0)
            .remove()
        }
    )
}

function addLegend(){
 // Adds a legend so users can decode colors
  let size = 10  // Size of the legend squares

  svg.selectAll('continentSquare')
      .data(continents)
      .enter()
      .append("rect")
      .attr("x", (d, i) => i * (size + 100) + 100)
      .attr("y", -margin.top/2)
      .attr("width", size)
      .attr("height", size)
      .style("fill", d => colorScale(d))

  svg.selectAll("continentName")
        .data(continents)
        .enter()
        .append("text")
        .attr("y", -margin.top/2 + size) // Align vertically with the square
        .attr("x", (d, i) => i * (size + 100) + 120)  
        .style("fill", d => colorScale(d))  // Match text color to the square
        .text(d => d) // The actual continent name
        .attr("text-anchor", "left")
        .style('font-size', '13px')
}

window.addEventListener('load', init);
