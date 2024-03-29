/*global LinkedList*/
/*requires ../core/object.js*/
/*requires ../core/array.js*/
/*requires ../core/linked-list.js*/

/*!
 * Knuth and Plass line breaking algorithm in JavaScript
 *
 * Licensed under the new BSD License.
 * Copyright 2009-2010, Bram Stein
 * All rights reserved.
 */
var linebreak = function (nodes, lines, settings) {
	var options = Object.extend({}, linebreak.defaults, settings),
		activeNodes = new LinkedList(),
		sum = {
			width: 0,
			stretch: 0,
			shrink: 0
		},
		lineLengths = lines,
		breaks = [],
		tmp = {
			data: {
				demerits: Infinity
			}
		};

	function breakpoint(position, demerits, ratio, line, fitnessClass, totals, previous) {
		return {
			position: position,
			demerits: demerits,
			ratio: ratio,
			line: line,
			fitnessClass: fitnessClass,
			totals: totals || {
				width: 0,
				stretch: 0,
				shrink: 0
			},
			previous: previous
		};
	}

	function computeCost(start, end, active, currentLine) {
		var width = sum.width - active.totals.width,
			stretch = 0,
			shrink = 0,
			// If the current line index is within the list of linelengths, use it, otherwise use
			// the last line length of the list.
			lineLength = currentLine < lineLengths.length ? lineLengths[currentLine - 1] : lineLengths[lineLengths.length - 1];

		if (nodes[end].type === 'penalty') {
			width += nodes[end].width;
		}

		if (width < lineLength) {
			// Calculate the stretch ratio
			stretch = sum.stretch - active.totals.stretch;

			if (stretch > 0) {
				return (lineLength - width) / stretch;
			} else {
				return options.infinity;
			}

		} else if (width > lineLength) {
			// Calculate the shrink ratio
			shrink = sum.shrink - active.totals.shrink;

			if (shrink > 0) {
				return (lineLength - width) / shrink;
			} else {
				return options.infinity;
			}
		} else {
			// perfect match
			return 0;
		}
	}


	// Add width, stretch and shrink values from the current 
	// break point up to the next box or forced penalty.
	function computeSum(breakPointIndex) {
		var result = {
				width: sum.width,
				stretch: sum.stretch,
				shrink: sum.shrink
			},
			i = 0;

		for (i = breakPointIndex; i < nodes.length; i += 1) {
			if (nodes[i].type === 'glue') {
				result.width += nodes[i].width;
				result.stretch += nodes[i].stretch;
				result.shrink += nodes[i].shrink;
			} else if (nodes[i].type === 'box' || (nodes[i].type === 'penalty' && nodes[i].penalty === -options.infinity && i > breakPointIndex)) {
				break;
			}
		}
		return result;
	}

	// The main loop of the algorithm
	function mainLoop(node, index, nodes) {
		var active = activeNodes.first(),
			next = null,
			ratio = 0,
			demerits = 0,
			candidates = [],
			badness,
			currentLine = 0,
			tmpSum,
			currentClass = 0;

		// The inner loop iterates through all the active nodes with line < currentLine and then
		// breaks out to insert the new active node candidates before looking at the next active
		// nodes for the next lines. The result of this is that the active node list is always
		// sorted by line number.
		while (active !== null) {

			candidates = [{demerits: Infinity}, {demerits: Infinity}, {demerits: Infinity}, {demerits: Infinity}];

			// Iterate through the linked list of active nodes to find new potential active nodes 
			// and deactivate current active nodes.
			while (active !== null) {
				next = active.next;
				currentLine = active.data.line + 1;
				ratio = computeCost(active.data.position, index, active.data, currentLine);

				// Deactive nodes when the the distance between the current active node and the
				// current node becomes too large (i.e. it exceeds the stretch limit and the stretch
				// ratio becomes negative) or when the current node is a forced break (i.e. the end
				// of the paragraph when we want to remove all active nodes, but possibly have a final
				// candidate active node---if the paragraph can be set using the given tolerance value.)
				if (ratio < -1 || (node.type === 'penalty' && node.penalty === -options.infinity)) {
					activeNodes.remove(active);
				}

				// If the ratio is within the valid range of -1 <= ratio <= tolerance calculate the 
				// total demerits and record a candidate active node.
				if (-1 <= ratio && ratio <= options.tolerance) {
					badness = 100 * Math.pow(Math.abs(ratio), 3);

					// Positive penalty
					if (node.type === 'penalty' && node.penalty >= 0) {
						demerits = Math.pow(options.demerits.line + badness + node.penalty, 2);
					// Negative penalty but not a forced break
					} else if (node.type === 'penalty' && node.penalty !== -options.infinity) {
						demerits = Math.pow(options.demerits.line + badness - node.penalty, 2);
					// All other cases
					} else {
						demerits = Math.pow(options.demerits.line + badness, 2);
					}

					if (node.type === 'penalty' && nodes[active.data.position].type === 'penalty') {
						demerits += options.demerits.flagged * node.flagged * nodes[active.data.position].flagged;
					}

					// Calculate the fitness class for this candidate active node.
					if (ratio < -0.5) {
						currentClass = 0;
					} else if (ratio <= 0.5) {
						currentClass = 1;
					} else if (ratio <= 1) {
						currentClass = 2;
					} else {
						currentClass = 3;
					}

					// Add a fitness penalty to the demerits if the fitness classes of two adjacent lines
					// differ too much.
					if (Math.abs(currentClass - active.data.fitnessClass) > 1) {
						demerits += options.demerits.fitness;
					}

					// Add the total demerits of the active node to get the total demerits of this candidate node.
					demerits += active.data.demerits;

					// Only store the best candidate for each fitness class
					if (demerits < candidates[currentClass].demerits) {
						candidates[currentClass] = {active: active, demerits: demerits, ratio: ratio};
					}
				}

				active = next;

				// Stop iterating through active nodes to insert new candidate active nodes in the active list
				// before moving on to the active nodes for the next line.
				// TODO: The Knuth and Plass paper suggests a conditional for currentLine < j0. This means paragraphs
				// with identical line lengths will not be sorted by line number. Find out if that is a desirable outcome.
				// For now I left this out, as it only adds minimal overhead to the algorithm and keeping the active node
				// list sorted has a higher priority.
				if (active !== null && active.data.line >= currentLine) {
					break;
				}
			}

			tmpSum = computeSum(index);

			candidates.forEach(function (candidate, fitnessClass) {
				var newNode;

				if (candidate.demerits < Infinity) {
					newNode = new LinkedList.Node(breakpoint(index, candidate.demerits, candidate.ratio, 
													candidate.active.data.line + 1, fitnessClass, tmpSum, candidate.active));
					if (active !== null) {
						activeNodes.insertBefore(active, newNode);
					} else {
						activeNodes.push(newNode);
					}
				}
			});
		}
	}

	// Add an active node for the start of the paragraph.
	activeNodes.push(new LinkedList.Node(breakpoint(0, 0, 0, 0, 0, undefined, null)));

	nodes.forEach(function (node, index, nodes) {
		if (node.type === 'box') {
			sum.width += node.width;
		} else if (node.type === 'glue') {
			if (index > 0 && nodes[index - 1].type === 'box') {
				mainLoop(node, index, nodes);
			}
			sum.width += node.width;
			sum.stretch += node.stretch;
			sum.shrink += node.shrink;
		} else if (node.type === 'penalty' && node.penalty !== options.infinity) {
			mainLoop(node, index, nodes);
		}
	});


	if (activeNodes.size() !== 0) {
		// Find the best active node (the one with the least total demerits.)
		activeNodes.forEach(function (node) {
			if (node.data.demerits < tmp.data.demerits) {
				tmp = node;
			}
		});

		while (tmp !== null) {
			breaks.push({position: tmp.data.position, ratio: tmp.data.ratio});
			tmp = tmp.data.previous;
		}
		var foo = breaks.reverse()
		console.log(foo[1])
		return foo;
	}
	return [];
};

Object.extend(linebreak, {
	defaults: {
		demerits: {
			line: 10,
			flagged: 100,
			fitness: 3000
		},
		infinity: 10000,
		tolerance: 2
	},
	glue: function (width, stretch, shrink) {
		return {
			type: 'glue',
			width: width,
			stretch: stretch,
			shrink: shrink
		};
	},
	box: function (width, value) {
		return {
			type: 'box',
			width: width,
			value: value
		};
	},
	penalty: function (width, penalty, flagged) {
		return {
			type: 'penalty',
			width: width,
			penalty: penalty,
			flagged: flagged
		};
	}
});
