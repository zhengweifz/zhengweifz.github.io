// python -m SimpleHTTPServer 8000import * as d3 from 'd3';
var proj = d3.geoMercator().scale(180000)
                                .translate([290,300])
                                .center([-76.612223, 39.294504]);
var path = d3.geoPath(proj);
var zoom = d3.zoom()
    .scaleExtent([1, 10])
    .on("zoom", zoomed);
var showStreets = false;
var state = "All";
var weekday = "All";
var month = "All";
var neighborhood ;
var totalCount ;
var streetData ;
var citationData;
var fineFilterVal;
var month_keys = d3.range(1,12);
month_keys.unshift('All');
var weekday_keys = ['All','Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
var summmarySvgWidth = 800;
var summmarySvgHeight = 250;
var margin = {top: 20, right: 20, bottom: 30, left: 40},
            width = summmarySvgWidth - margin.left - margin.right,
            height = summmarySvgHeight - margin.top - margin.bottom;
function updateSummary(d) {
    d3.select('#nh-name').text(d.properties.csa);
    d3.select('#citation-count').text(d.properties.citation_count);
    d3.select('#total-fine').text("$" + d.properties.total_fine);
}
function zoomed() {
    d3.select('#map').attr("transform", d3.event.transform);
}

function plotArea(data){
    // choose a projection
    citationData = data.features;
    console.log(data.features[0]);
    var svg = d3.select('#container')
            .attr('width','100%')
            .attr('height', '100%')
            .append('div')
            .attr('id', "heatmap")
            .style('vertical-align','top')
            .style('display', 'inline-block')
            .style('width','50%')
            .style('height', '100%')
            .append('svg')
            .attr('id', 'headmapsvg')
            .attr('width', 800)
            .attr('height', 800);
    var map = svg.append('g').attr('id', 'map').call(zoom);       
    var citationCounts = [];
    for (var i=0; i < data.features.length; i++) {
        citationCounts.push(data.features[i].properties.citation_count);
    }
    var countMin = d3.min(citationCounts);
    var countMean = d3.mean(citationCounts);
    var countMax = d3.max(citationCounts);

    var colorDomain = [countMin,
                  countMean,
                  countMax];
    var color = d3.scaleLinear()
            .domain(colorDomain)
            .range(["#ffffbf", "#2c7bb6", "#d7191c"])
            .interpolate(d3.interpolateHcl);
    
    // location settings are from 
    // http://feyderm.github.io/code/baltimore_vacant_buildings_d3.html
    var areaG = map.append('g').attr('class', 'areaGroup');
    var gs = areaG.selectAll('g')
                .data(data.features, function(d){return d.properties.csa;});
    // remove
    gs.exit().remove();
    // add new groups
    var areas = gs.enter()
                .append('g')
                .append('path')
                .attr('d', path)
                .attr('opacity', 0.6)
                .attr('stroke', 'gray')
                .attr('stroke-width', 1)
                .attr('class', 'neighborhood')
                .attr('fill', function(d ){
                    return color(d.properties.citation_count);
                })
                .on('click', function(d) {
                        // this inside this function refer to d3 element object
                        d3.event.stopPropagation();
                        var curPath = d3.select(d3.event.currentTarget);
                        curPath.attr('opacity', 1);
                        if (curPath.attr('data-show') === undefined || curPath.attr('data-show') === 'false' ) {
                            var shape = d3.select(this.parentNode);
                            plotCitation(d,shape);
                            curPath.attr('data-show' ,'true');
                        } else {
                            curPath.attr('data-show' ,'false');
                            var g = d3.select(this.parentNode);
                            g.selectAll('.point').remove();
                        }
                        updateSummary(d);
                        createStateSummaryPlot(d);
                        createMonthSummaryPlot(d);
                        createWeekdayhSummaryPlot(d);

                })
              .on('mouseover', function(d) {
                  d3.event.stopPropagation();
                  d3.select(this).style("cursor", "pointer");
              })
              .on('mouseout', function (d) {
                //   d3.event.stopPropagation();
                    d3.select(this).style("cursor", "default");
                //    var g = d3.select(this.parentNode);
                //         g.selectAll('.point').remove();
                //     var curPath = d3.select(d3.event.currentTarget);
                //     curPath.attr('opacity', 0.7);
                //     tooltip.style('visibility', 'hidden');
             });
    areas = areas.merge(gs);  
   createLegend(color, countMin, countMax);
   createTooltip();
   createControls(data);
   createSummaryPlots();
  
}


function plotCitation(d, shape) {
    // mouse event has to be added before transition
      shape.selectAll('g')
            .data(d.properties.data_points, function(d) { return d.Citation;})
            .enter()
            .append('g')
            .attr('class', 'point')
            .append('circle') 
            .attr('class', 'point-shape point-circle')
            .on('mouseover', function(d) {
                        // display tooltip 
                        var cenLoc = proj([+d.Longitude, +d.Latitude]);
                        showTooltip(d, cenLoc); 
              })
            .on('mouseout', function(d){
                hideTooltip();
            })
            .transition()
            .duration(500)
            .attr('cx', function(d) {
                return proj([+d.Longitude, +d.Latitude])[0];
            })
            .attr('cy', function(d) {
                return proj([+d.Longitude, +d.Latitude])[1];
            })
            .attr('r', 2)
            .attr('fill', '#1a1a1a')
            .style("opacity", 0.35)
            ;
}

// tooltip section 
function createTooltip() {
    var tooltip = d3.select('#container')
        .append('div')
        .attr('id', 'tooltip')
        .attr('class', 'd3-tooltip')
        .style('visibility', 'hidden')
        ;
}

function showTooltip(d, cenLoc) {
    //  d3.select('.nhs-name').text(d.properties.csa);
    //  d3.select('.count-value').text(d.properties.citation_count);
    var tooltip = d3.select('#tooltip');
    tooltip.select('ul').remove();
    var ul = tooltip.append('ul').style("list-style", "none");
    for (var key in d) {
        if (d.hasOwnProperty(key)) {
            var li = ul.append("li").style('margin-top', '5px');
            li.append('label').text(key + ": ").style('margin-right', '15px'); 
            li.append('label').text(d[key]);
        }
    }               
     d3.select('#tooltip').style('top', (cenLoc[1]) + 'px')
                                .style('left', (cenLoc[0]) + 'px')
                                .style('visibility', 'visible');
}
function hideTooltip() {
       d3.select("#tooltip").style('visibility', 'hidden');
}

//legend section
// legend codes are based on the example on http://bl.ocks.org/nowherenearithaca/4449376
function createLegend(color, countMin, countMax) {
     var legendX1 = 650,
         legendWidth = 30,
         lengendY1 = 100,
         legendHeight = 200;
     var svg = d3.select('#headmapsvg');
     svg.append("g")
        .append("defs")
        .append("linearGradient")
        .attr("id","linearGradient")
        .attr("x1","0%")
        .attr("x2","0%")
        .attr("y2","0%")
        .attr("y1","100%"); 
    var stopvalGenerator = d3.interpolateNumber(countMin, countMax); 
    var stopColors = [];   
    for (var i = 0; i <=1.01; i +=0.01) {
        stopColors.push({perc: i, stopColorVal: stopvalGenerator(i)});
    }   
    console.log(stopColors.length);
   var stops = d3.select('#linearGradient')
                        .selectAll('stop')
                        .data(stopColors)
                        .enter()
                        .append('stop')
                        .attr('offset',function(d) {
                                return d.perc;
                        })
                        .attr('stop-color', function(d) {
                            return color(d.stopColorVal);
                        });
    // lengend bar                    
    var legend = svg.append("g").attr("id", "legend");
        legend.append("rect")
                .attr("fill","url(#linearGradient)")
                .attr("x",legendX1)
                .attr("y",lengendY1)
                .attr("width",legendWidth)
                .attr("height",legendHeight);
    //add text on either side of the bar
    var p = d3.precisionFixed(1);
    var intFormat = d3.format("." + p + "f");
    for (var i = 0; i<=100; i += 25 ){
        legend.append("text")
            .attr("class","legendText")
            .attr("class","legendText")
            .attr("text-anchor", "left")
            .attr("x",legendX1 + legendWidth + 15)
            .attr("y",lengendY1 + legendHeight * (100-i) / 100)
            .attr("dy",0)
            .text(intFormat(stopColors[i].stopColorVal));
    }
}

function stateStroke(d){
     if (d.State === state) {
            return "#cccc00";
        }  else{
            return "none";
        }
}

function stateStrokeWidth(d) {
      if (d.State === state) {
                return 0.5;
            }  else{
                return 0;
            }
}

function weekdayColor(d) {
     if (d.ViolWeekday === weekday) {
            return "#ff9900";
        }  else{
            return "#1a1a1a";
        }
}

function filterCitationByFine(){
    console.log(fineFilterVal);
    d3.selectAll('.point-shape').style('opacity', function(d){
        if (+d.ViolFine < fineFilterVal) {
            return 0;
        } else {
            return 0.35;
        }
    });
}

function updateMinFine(minFine){
    console.log(minFine);
    fineFilterVal = +minFine;
    d3.select("#min-fine-value").text('$' + minFine);
    d3.select("#min-fine").property("value", minFine);
    filterCitationByFine();
}

function createControls(data) {
    var stateSelect = d3.select('#controls').append('select')
                                            .attr('class', 'select')
                                            .on('change', function(){
                                                    var ind = d3.event.currentTarget.selectedIndex;
                                                    state = data.state_keys[d3.event.currentTarget.selectedIndex];
                                                    //change color of points 
                                                    d3.selectAll('.point-shape')
                                                        .attr('stroke', stateStroke)
                                                        .attr('stroke-width', stateStrokeWidth);
                                                });
      stateSelect.selectAll('option')
        .data(data.state_keys)
        .enter()
        .append('option')
        .attr('value', function(d){return d;})
        .text(function(d) {return d;});
    var monthSelect = d3.select('#controls').append('select')
                    .attr('class', 'select')
                    .on('change', function(){
                        var ind = d3.event.currentTarget.selectedIndex;
                        month = data.month_keys[d3.event.currentTarget.selectedIndex];
                        //change shape of points 
                        var points = d3.selectAll('.point');
                        //remove all rect points
                        d3.selectAll('.point-rect').remove();
                        // reset opacity of circles
                        d3.selectAll('.point-circle').style('opacity', 0.35);
                        // filter data
                        console.log(points.data());
                        var curMonth = points.data()
                                                .filter(function(d){
                                                    return month.toString() === d.ViolMonth; 
                                                });
                        console.log(curMonth);
                        var curMonthPoints =  points.data(curMonth);
                        curMonthPoints.selectAll(".point-circle").style("opacity", 0);
                        // append rect
                        curMonthPoints.append('rect')
                                      .attr('class','point-shape point-rect')
                                      .attr('x', function(d){
                                            console.log(d);
                                             return proj([+d.Longitude, +d.Latitude])[0]-2;
                                      })
                                      .attr('y', function(d){
                                             return proj([+d.Longitude, +d.Latitude])[1]-2;
                                      })
                                      .attr('width',5)
                                      .attr('height', 5)
                                      .attr('fill', weekdayColor)
                                      .style("opacity", 0.35)
                                      .attr('stroke', stateStroke)
                                      .attr('stroke-width', stateStrokeWidth);
                        console.log("change shape");          
                        // d3.selectAll('.point').attr('fill', function(d){
                        //     if (d.ViolWeekday === weekday) {
                        //         return "#ff9900";
                        //     }  else{
                        //         return "#1a1a1a";
                        //     }
                        // });
                    });
    monthSelect.selectAll('option')
        .data(month_keys)
        .enter()
        .append('option')
        .attr('value', function(d){return d;})
        .text(function(d) {return d;});
    var weekdaySelect = d3.select('#controls').append('select')
                    .attr('class', 'select')
                    .on('change', function(){
                        var ind = d3.event.currentTarget.selectedIndex;
                        weekday = data.weekday_keys[d3.event.currentTarget.selectedIndex];
                        //change color of points 
                        console.log(weekday);
                        d3.selectAll('.point-shape').attr('fill', weekdayColor);
                    });
       weekdaySelect.selectAll('option')
        .data(weekday_keys)
        .enter()
        .append('option')
        .attr('value', function(d){return d;})
        .text(function(d) {return d;});
      // Selects
    var showStreetBtn =  d3.select('#controls').append('button')
        .attr('class', 'select')
        .style('margin-right', '50px')
        .text('Toggle Streets')
        .on('click', function(){
               showStreets  = !showStreets;
               console.log(showStreets);
              if (showStreets) {
                  if(streetData !== undefined) {
                      plotStreets(streetData);
                  } else {
                      d3.json('assets/Street_Centerlines.geojson', plotStreets);
                  } 
              } else {
                 d3.select('.streets').remove();
              }
        });
    //  <label class="summary-label">Fine Over: <span id="min-fine-value">…</span> </label><input type="range" min="0" max="1000" id="min-fine"> 
     d3.select('#controls').append('label').attr('class',"summary-label").text("Fine Over: ").append("span").attr("id", "min-fine-value");
     d3.select('#controls').append('input').attr('type', 'range').attr('id', 'min-fine').attr('min',0).attr('max',1000).attr('value',0).on('input', function(){
         updateMinFine(+this.value);
     });
}

function plotStreets(data) {
    streetData = data;
    var streetG = d3.select('#map').append('g').attr('class', 'streets');
    var gs = streetG.selectAll('g')
                .data(data.features)
                .enter()
                .append('g')
                .append('path')
                .attr('d', path)
                .attr('opacity', 0.3)
                .attr('stroke', 'blue')
                .attr('stroke-width', 1)
                .attr('class', 'neighborhood')
                .attr('fill', 'none')
                ;
}
function createSummaryPlots() {
      var plotDiv =d3.select('#container')
            .append('div')
            .attr('id', "summaryplots")
            .style('display', 'inline-block')
            .style('width','40%')
            .style('height', '100%');
     plotDiv.append("lengnd").text('State Count');
      var stateGroup = plotDiv.append('svg')
            .attr('id', 'stateSvg')
            .attr('width', summmarySvgWidth)
            .attr('height', summmarySvgHeight)
            .append("g")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .attr('id', 'stateGroup')
            .attr("transform", 
                "translate(" + margin.left + "," + margin.top + ")");
      stateGroup.append("g")
                    .attr('id', 'stateXaxis')
                    .attr("transform", "translate(0," + height + ")");
      stateGroup.append("g")
                    .attr('id', 'stateYaxis');
      plotDiv.append("lengnd").text('Month Count');
      var monthGroup = plotDiv.append('svg')
            .attr('id', 'monthSvg')
            .attr('width', summmarySvgWidth)
            .attr('height', summmarySvgHeight)
            .append("g")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .attr('id', 'monthGroup')
            .attr("transform", 
                "translate(" + margin.left + "," + margin.top + ")")
       monthGroup.append("g")
                    .attr('id', 'monthXaxis')
                    .attr("transform", "translate(0," + height + ")");
      monthGroup.append("g")
                    .attr('id', 'monthYaxis');  
      var weekdayGroup = plotDiv.append('svg')
            .attr('id', 'weekdaySvg')
            .attr('width', 500)
            .attr('height', 500)
            .append("g")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .attr('id', 'weekdayGroup')
            .attr("transform", "translate(" + 250 + "," + 250 +")"); // Moving the center point. 1/2 the width and 1/2 the height
}
function createStateSummaryPlot(data){
     var stateData = data.properties.state_count;
        var x = d3.scaleBand()
                .range([0, width])
                .domain(stateData.map(function(d) {
                    return d.State; }))
                .padding(0.1);
        var ymax = d3.max(stateData, function(d){return d.value;});
        var y = d3.scaleLinear()
                .domain([0, ymax])
                .range([height, 0]);    
     // updateData 
        var bars = d3.select('#stateGroup').selectAll(".bar")
                    .data(stateData, function(d){return d.State;});
         bars.exit().transition()
                        .duration(300)
                        .attr("y", y(0))
                        .attr("height", height - y(0))
                        .style('fill-opacity', 1e-6).remove();  
        var enterBars =  bars.enter()
                    .append("rect")
                    .on("mouseover", function(d) {
                        console.log('hi');
                        d3.select(d3.event.currentTarget)
                            .select(".bartext")
                            .style('opacity', 1);
                    })
                    .on("mouseout", function(d, i) {
                        d3.select(d3.event.currentTarget).attr("fill", "steelblue");
                        d3.select(d3.event.currentTarget)
                            .select(".bartext")
                            .style('opacity', 0);
                        })
                        .attr("class", "bar")
                        .attr("y", y(0))
                        .attr("height", height - y(0))
                        .attr("fill", "steelblue")
                        ;  
                        
                enterBars.merge(bars)
                    .transition().duration(300)
                    .attr("x", function(d) { 
                            return x(d.State); })
                    .attr("width", x.bandwidth())
                    .attr("y", function(d) { 
                            return y(d.value); })
                    .attr("height", function(d) { return height - y(d.value); })
                   ;
           
            d3.select('#stateXaxis').call(d3.axisBottom(x));
            d3.select('#stateYaxis').call(d3.axisLeft(y));       
         
}
function createMonthSummaryPlot(data){
    monthData = data.properties.month_count;
    var x = d3.scaleLinear().range([0, width]).domain([0, 11]);
    var ymax = d3.max(monthData, function(d){return d.value;});
    var y = d3.scaleLinear().range([height, 0]).domain([0, ymax]);
    // define the line
    var countline = d3.line()
        .x(function(d) { 
            return x(+d.ViolMonth); })
        .y(function(d) { return y(d.value); });
    d3.select('#monthGroup').selectAll('path').remove();
    var line = d3.select('#monthGroup').append('path')
              .data([monthData]) // data have to take array of lines 
              .attr('class', 'line') //line attribute for path
                .attr("d", countline)
                .attr("fill", 'none')
                .attr("stroke", "steelblue")
                .attr("stroke-width", 2)
                ;
     d3.select('#monthXaxis').call(d3.axisBottom(x));
     d3.select('#monthYaxis').call(d3.axisLeft(y));       
}
function createWeekdayhSummaryPlot(data){
    var weekData = data.properties.weekday_count;
    console.log(weekData);
    var colors = d3.scaleOrdinal(d3.schemeCategory10);
    var radius = 240;
    var arc = d3.arc()
        .outerRadius(radius - 10)
        .innerRadius(0);
    var labelArc = d3.arc()
        .outerRadius(radius - 40)
        .innerRadius(radius - 40);
    var pie = d3.pie()
	    .value(function(d) { return d.value; })(weekData);
    d3.select('#weekdayGroup').selectAll("arc")
                        .remove().transition()
                        .duration(300);
    var g = d3.select('#weekdayGroup').selectAll("arc")
            .data(pie)
            .enter().append("g")
            .attr("class", "arc");
    g.append("path")
      .attr("d", arc)
      .attr("fill", function(d) { 
          console.log(d.data.ViolWeekday);
          console.log(colors(d.data.ViolWeekday));
          return colors(d.data.ViolWeekday); 
        })
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .transition()
      .duration(300);
    d3.selectAll('.arctext').remove();
    g.append("text")
        .attr('class', 'arctext')
        .attr("transform", function(d) { return "translate(" + labelArc.centroid(d) + ")"; })
            .text(function(d) { return d.data.ViolWeekday;})	
            .style("fill", "gray");
}

d3.json('assets/citation.geojson', plotArea);


//d3.json('assets/citation.json', plotCitation);


        