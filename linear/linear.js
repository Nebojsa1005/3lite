
// Get JSON data
treeJSON = d3.json("../data.json", function(error, data) {
    if (error) {
        throw error
    }

    let from = document.querySelector('#from')
    let to = document.querySelector('#to')
    let submitButton = document.querySelector('#submit')

    let items = data
    let map = new Map
    let result
    let newRoot

    // Calculate total nodes, max label length
    var totalNodes = 0;
    var maxLabelLength = 0;
    // panning variables
    var panSpeed = 200;
    // Misc. variables
    var i = 0;
    var duration = 750;
    var root;

    items.forEach(({ lu_company, lu_doctype, lu_document, date_sent }) => {
        map.has(lu_company) || map.set(lu_company, { 
            name: lu_company, 
            children: [],
        });
        map.get(lu_company).children.push({ 
            name: lu_doctype,
            date: date_sent,
            children: [{
               name: `${lu_document}/${date_sent}`
            }]
         });
    });

    result = [{
        name: 'Companies',
        children: [...map.values()]
    }];

        result[0].children.forEach((company) => {
            let mapChildren = new Map
            company.children.forEach((doctype) => {
                   mapChildren.has(doctype.name) || mapChildren.set(doctype.name, {
                       name: doctype.name,
                       children: []
                   })
                 
                   doctype.children.forEach(({ name }) => {
                       let newName = name.split("")
                       newName.splice(newName.length - 11)
                       mapChildren.get(doctype.name).children.push({
                           name: newName.join(""),
                           children: [{
                               name: name.split("").splice(name.length - 10).join("").replace('/', '')
                           }]
                       })
                   })
            })
            company.children = [...mapChildren.values()]
        })
     
     
      //----------------FOR MIN AND MAX DATES
        let documentDates = []

        function setFormDates() {
            result[0].children.forEach(company => {      
                company.children.forEach(doctype => {  
                    doctype.children.forEach((document) => {
                        documentDates.push(new Date(document.children[0].name).getTime())
                    })
                })
            })
        }
        setFormDates()

         //--------------SETTING MIN AND MAX INPUT DATES VALUES

         let fromDateInfo = []
         let toDateInfo = []
 
         let fromDateParse = new Date(Math.min(...documentDates))
         fromDateInfo.push(fromDateParse.getFullYear())
         fromDateInfo.push(fromDateParse.getMonth() <= 10 ? "0" + fromDateParse.getMonth() : fromDateParse.getMonth())
         fromDateInfo.push(fromDateParse.getDate())
 
         let toDateParse = new Date(Math.max(...documentDates))
         toDateInfo.push(toDateParse.getFullYear())
         toDateInfo.push(toDateParse.getMonth() <= 10 ? "0" + toDateParse.getMonth() : toDateParse.getMonth())
         toDateInfo.push(toDateParse.getDate())
         from.value = fromDateInfo.join("-")
         to.value = toDateInfo.join("-")

 
         //---------------LISTENING TO NEW INPUT DATE VALUES
 
        //  let oldFromDate = from.value;
        //  let oldToDate = to.value
 
        //  let fromDate = oldFromDate
        //  let toDate = oldToDate

        let fromDate = from.value
        let toDate = to.value
        
         let changedFromDate = function(){
             if(from.value !== fromDate){
                fromDate = from.value
             }
         }
 
         let changedToDate = function(){
             if(to.value !== toDate){
                 toDate = to.value  
             }   
         }
 
 
         from.addEventListener("blur", function(){
             changedFromDate()
         })
 
         to.addEventListener("blur", function(){
             changedToDate()
         })
         
 
         //------------------FILTERING THE TREE
 
        let oldRoot = result.map(el => el)
         function setData() {
             newRoot = [...oldRoot] 
             newRoot[0].children.forEach(company => {    
                 company.children.forEach(doctype => {
                     let filteredDoctype
                     if(doctype.children) {
                        filteredDoctype = doctype.children.filter((document) => {
                             if(document.children[0].name) {
                                currentDate = new Date(document.children[0].name)
                                return currentDate >= new Date(fromDate) && currentDate <= new Date(toDate)
                            }
                            
                        })
                    } 
                    doctype.children = filteredDoctype
                 })
            })
            console.log("newRoot", newRoot);
            console.log("result", result);
        }
            
           
 

    // size of the diagram
    var viewerWidth = $(document).width();
    var viewerHeight = $(document).height();
        var tree = d3.layout.tree()
            .size([viewerHeight, viewerWidth]);

        // define a d3 diagonal projection for use by the node paths later on.
        var diagonal = d3.svg.diagonal()
            .projection(function(d) {
                return [d.y, d.x];
            });

  
    // A recursive helper function for performing some setup by walking through all nodes

    function visit(parent, visitFn, childrenFn) {
        if (!parent) return;
        visitFn(parent);
        var children = childrenFn(parent);
        if (children) {
            var count = children.length;
            for (var i = 0; i < count; i++) {
                visit(children[i], visitFn, childrenFn);
            }
        }
    }

    // Call visit function to establish maxLabelLength
    visit(result[0], function(d) {
        totalNodes++;
        maxLabelLength = Math.max(d.name.length, maxLabelLength);

    }, function(d) {
        return d.children && d.children.length > 0 ? d.children : null;
    });


    // TODO: Pan function, can be better implemented.

    function pan(domNode, direction) {
        var speed = panSpeed;
        if (panTimer) {
            clearTimeout(panTimer);
            translateCoords = d3.transform(svgGroup.attr("transform"));
            if (direction == 'left' || direction == 'right') {
                translateX = direction == 'left' ? translateCoords.translate[0] + speed : translateCoords.translate[0] - speed;
                translateY = translateCoords.translate[1];
            } else if (direction == 'up' || direction == 'down') {
                translateX = translateCoords.translate[0];
                translateY = direction == 'up' ? translateCoords.translate[1] + speed : translateCoords.translate[1] - speed;
            }
            scaleX = translateCoords.scale[0];
            scaleY = translateCoords.scale[1];
            scale = zoomListener.scale();
            svgGroup.transition().attr("transform", "translate(" + translateX + "," + translateY + ")scale(" + scale + ")");
            d3.select(domNode).select('g.node').attr("transform", "translate(" + translateX + "," + translateY + ")");
            zoomListener.scale(zoomListener.scale());
            zoomListener.translate([translateX, translateY]);
            panTimer = setTimeout(function() {
                pan(domNode, speed, direction);
            }, 50);
        }
    }

    // Define the zoom function for the zoomable tree

    function zoom() {
        svgGroup.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
    }

    // define the zoomListener which calls the zoom function on the "zoom" event constrained within the scaleExtents
    var zoomListener = d3.behavior.zoom().scaleExtent([0.1, 3]).on("zoom", zoom);


    // define the baseSvg, attaching a class for styling and the zoomListener
    var baseSvg = d3.select("#tree-container").append("svg")
        .attr("width", 100 + "%")
        .attr("height", 100 + "vh")
        .attr("class", "overlay")
        .call(zoomListener);


   
    var overCircle = function(d) {
        selectedNode = d;
        updateTempConnector();
    };
    var outCircle = function(d) {
        selectedNode = null;
        updateTempConnector();
    };

    // Function to update the temporary connector indicating dragging affiliation
    var updateTempConnector = function() {
        var link = svgGroup.selectAll(".templink").data(data);

        link.enter().append("path")
            .attr("class", "templink")
            .attr("d", d3.svg.diagonal())
            .attr('pointer-events', 'none');

        link.attr("d", d3.svg.diagonal());

        link.exit().remove();
    };

    // Function to center node when clicked/dropped so node doesn't get lost when collapsing/moving with large amount of children.

    function centerNode(source) {
        scale = zoomListener.scale();
        x = -source.y0;
        y = -source.x0;
        x = x * scale + viewerWidth / 5;
        y = y * scale + viewerHeight / 2;
        d3.select('g').transition()
            .duration(duration)
            .attr("transform", "translate(" + x + "," + y + ")scale(" + scale + ")");
        zoomListener.scale(scale);
        zoomListener.translate([x, y]);
    }

    // Toggle children function

    function toggleChildren(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else if (d._children) {
            d.children = d._children;
            d._children = null;
        }
        return d;
    }

    // Toggle children on click.

    function click(d) {
        if (d3.event.defaultPrevented) return; // click suppressed
        d = toggleChildren(d);
        update(d);
        centerNode(d);
    }

    function update(source) {
        // Compute the new height, function counts total children of root node and sets tree height accordingly.
        // This prevents the layout looking squashed when new nodes are made visible or looking sparse when nodes are removed
        // This makes the layout more consistent.
        var levelWidth = [1];
        var childCount = function(level, n) {

            if (n.children && n.children.length > 0) {
                if (levelWidth.length <= level + 1) levelWidth.push(0);

                levelWidth[level + 1] += n.children.length;
                n.children.forEach(function(d) {
                    childCount(level + 1, d);
                });
            }
        };
        childCount(0, root);
            var newHeight = d3.max(levelWidth) * 25; // 25 pixels per line  
            tree = tree.size([newHeight, viewerWidth]);


        // Compute the new tree layout.
        var nodes = tree.nodes(root).reverse(),
            links = tree.links(nodes);

        // Set widths between levels based on maxLabelLength.
        nodes.forEach(function(d) {
            d.y = (d.depth * (maxLabelLength * 5)); //maxLabelLength * 10px
            // alternatively to keep a fixed scale one can set a fixed depth per level
            // Normalize for fixed-depth by commenting out below line
            // d.y = (d.depth * 500); //500px per level.
        });

        // Update the nodes…
        node = svgGroup.selectAll("g.node")
            .data(nodes, function(d) {
                return d.id || (d.id = ++i);
            });

        // Enter any new nodes at the parent's previous position.
        var nodeEnter = node.enter().append("g")
            .attr("class", "node")
            .attr("transform", function(d) {
                return "translate(" + source.y0 + "," + source.x0 + ")";
            })
            .on('click', click);

        nodeEnter.append("circle")
            .attr('class', 'nodeCircle')
            .attr("r", 0)
            .style("fill", function(d) {
                return d._children ? "lightsteelblue" : "#fff";
            });

        nodeEnter.append("text")
            .attr("x", function(d) {
                return d.children || d._children ? -10 : 10;
            })
            .attr("dy", ".35em")
            .attr('class', 'nodeText')
            .attr("text-anchor", function(d) {
                return d.children || d._children ? "end" : "start";
            })
            .text(function(d) {
                return d.name;
            })
            .style("fill-opacity", 0);

        // phantom node to give us mouseover in a radius around it
        nodeEnter.append("circle")
            .attr('class', 'ghostCircle')
            .attr("r", 30)
            .attr("opacity", 0.2) // change this to zero to hide the target area
        .style("fill", "red")
            .attr('pointer-events', 'mouseover')
            .on("mouseover", function(node) {
                overCircle(node);
            })
            .on("mouseout", function(node) {
                outCircle(node);
            });

        // Update the text to reflect whether node has children or not.
        node.select('text')
            .attr("x", function(d) {
                return d.children || d._children ? -10 : 10;
            })
            .attr("text-anchor", function(d) {
                return d.children || d._children ? "end" : "start";
            })
            .text(function(d) {
                return d.name;
            });

        // Change the circle fill depending on whether it has children and is collapsed
        node.select("circle.nodeCircle")
            .attr("r", 8)
            .style("fill", function(d) {
                return d._children ? "lightsteelblue" : "#fff";
            });

        // Transition nodes to their new position.
        var nodeUpdate = node.transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + d.y + "," + d.x + ")";
            });

        // Fade the text in
        nodeUpdate.select("text")
            .style("fill-opacity", 1);

        // Transition exiting nodes to the parent's new position.
        var nodeExit = node.exit().transition()
            .duration(duration)
            .attr("transform", function(d) {
                return "translate(" + source.y + "," + source.x + ")";
            })
            .remove();

        nodeExit.select("circle")
            .attr("r", 0);

        nodeExit.select("text")
            .style("fill-opacity", 0);

        // Update the links…
        var link = svgGroup.selectAll("path.link")
            .data(links, function(d) {
                return d.target.id;
            });

        // Enter any new links at the parent's previous position.
        link.enter().insert("path", "g")
            .attr("class", "link")
            .attr("d", function(d) {
                var o = {
                    x: source.x0,
                    y: source.y0
                };
                return diagonal({
                    source: o,
                    target: o
                });
            });

        // Transition links to their new position.
        link.transition()
            .duration(duration)
            .attr("d", diagonal);

        // Transition exiting nodes to the parent's new position.
        link.exit().transition()
            .duration(duration)
            .attr("d", function(d) {
                var o = {
                    x: source.x,
                    y: source.y
                };
                return diagonal({
                    source: o,
                    target: o
                });
            })
            .remove();

        // Stash the old positions for transition.
        nodes.forEach(function(d) {
            d.x0 = d.x;
            d.y0 = d.y;
        });
    }

    // Append a group which holds all nodes and which the zoom Listener can act upon.
    var svgGroup = baseSvg.append("g");

    // Define the root
    root = result[0];
    root.x0 = viewerHeight / 2;
    root.y0 = 0;

    // Layout the tree initially and center on the root node.
    update(root);
    centerNode(root);

  

    submitButton.addEventListener('click', function (event) {
        event.preventDefault()
        setData() 
        update(newRoot);
        centerNode(root);
    
    })
});