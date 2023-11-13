import { Vector3 } from "./thirdparty/three.module.js";
import { mergeVertices } from './thirdparty/BufferGeometryUtils.js';

class Navigation {
    constructor(navpathGeometry) {
        let waypoints = [];

        const mergedGeometry = mergeVertices(navpathGeometry);

        const pos = mergedGeometry.attributes.position.array;
        for (let i = 0; i < pos.length; i += 3) {
            const v = new Vector3(pos[i], pos[i + 1], pos[i + 2]);

            v.edges = [];

            waypoints.push(v);
        }

        const index = mergedGeometry.index.array;
        for (let i = 0; i < index.length; i += 2) {
            waypoints[index[i]].edges.push(waypoints[index[i + 1]]);
            waypoints[index[i + 1]].edges.push(waypoints[index[i]]);
        }

        this.waypoints = waypoints;
    }

    distanceBetween(a, b) {
        return a.clone().sub(b).lengthSq();
    }

    findClosestWaypoint(origin) {
        let closestWaypoint = null;
        let closestDist = Infinity;

        for (let i = 0; i < this.waypoints.length; i++) {
            const dist = this.distanceBetween(this.waypoints[i], origin);

            if (dist < closestDist) {
                closestDist = dist;
                closestWaypoint = this.waypoints[i];
            }
        }

        return closestWaypoint;
    }

    breadthFirstSearch(start) {
        start.visited = true;

        const unvisitedNodes = [start];

        let goal = null;

        while (unvisitedNodes.length !== 0) {
            const n = unvisitedNodes.shift();

            if (n.goal) {
                goal = n;

                break;
            }

            for (const e of n.edges) {
                if (e.visited) {
                    continue;
                }

                e.visited = true;
                e.pathParent = n;
                e.parentDistance = this.distanceBetween(n, e);

                unvisitedNodes.push(e);
            }

            // unvisitedNodes.sort((a,b) => {
            //     return a.parentDistance - b.parentDistance;
            // });
        }

        const path = [goal];
        while (goal.pathParent) {
            goal = goal.pathParent;

            path.push(goal);
        }

        return path;
    }

    findPath(start, destination) {
        this.findClosestWaypoint(destination).goal = true;

        const path = this.breadthFirstSearch(this.findClosestWaypoint(start));

        for (const waypoint of this.waypoints) {
            waypoint.visited = undefined;
            waypoint.goal = undefined;
            waypoint.pathParent = undefined;
            waypoint.parentDistance = undefined;
        }

        return path;
    }
}

export { Navigation };
