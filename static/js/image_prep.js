const fileInput = document.getElementById('fileInput');

let base64Output = 'blank';

function drawImages(img_array) {
    scale = 0.7;
    img_array.forEach((img, i) => {
            const imgCanvas = document.createElement('canvas');                
            const verticalPadding = 10;
            imgCanvas.style.paddingTop = `${verticalPadding}px`;
            imgCanvas.style.paddingBottom = `${verticalPadding}px`;
            width = Math.floor(img.cols * scale);
            height = Math.floor(img.rows * scale);
            imgCanvas.style.width = width;
            imgCanvas.style.height = height;
            cv.imshow(imgCanvas, img);
            document.body.appendChild(imgCanvas);
        });
}

function delPrevCanvases() {
    let canvases = document.querySelectorAll('canvas');
    for (let i = 0; i < canvases.length; i++) {
        document.body.removeChild(canvases[i]);
    }
}

function extractImage(img) {
	delPrevCanvases();        
    let src = cv.imread(img);
    let original = new cv.Mat();
    cv.cvtColor(src, src, cv.COLOR_RGBA2RGB);
    cv.cvtColor(src, original, cv.COLOR_RGBA2RGB);

    // Morphology
    let blur = 20;
    let kernel = new cv.Mat.ones(blur, blur, cv.CV_8U);
    cv.morphologyEx(src, src, cv.MORPH_CLOSE, kernel);

    // GrabCut
    let mask = new cv.Mat.zeros(src.rows, src.cols, cv.CV_8U);;
    let bgdModel = new cv.Mat();
    let fgdModel = new cv.Mat();
    let rect = new cv.Rect(50, 50, src.cols - 70, src.rows - 70);
    cv.grabCut(src, mask, rect, bgdModel, fgdModel, 1, cv.GC_INIT_WITH_RECT);

    // Create mask
    for (let i = 0; i < mask.rows; i++) {
        for (let j = 0; j < mask.cols; j++) {
            let val = mask.ucharPtr(i, j)[0];
            mask.ucharPtr(i, j)[0] = (val === 2 || val === 0) ? 0 : 255;
        }
    }
    let fg = new cv.Mat();
    cv.bitwise_and(src, src, fg, mask);

    // Grayscale and blur
    let gray = new cv.Mat();
    cv.cvtColor(fg, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, gray, new cv.Size(11, 11), 0);

    // Contours
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();

    cv.findContours(gray, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    let approx = new cv.Mat();

    for (let i = 0; i < contours.size(); i++) {
        let c = contours.get(i);
        let peri = cv.arcLength(c, true);
        cv.approxPolyDP(c, approx, 0.02 * peri, true);
        if (approx.rows === 4) {
            break;
        }
    }

    let points = [];
    for (let i = 0; i < approx.rows; i++) {
        points.push({ x: approx.intPtr(i, 0)[0], y: approx.intPtr(i, 0)[1] });
    }

    let ordered = orderPoints(points);
    let [tl, bl, br, tr] = ordered;
    let widthA = Math.hypot(br[0] - bl[0], br[1] - bl[1]);
    let widthB = Math.hypot(tr[0] - tl[0], tr[1] - tl[1]);
    let maxWidth = Math.max(Math.floor(widthA), Math.floor(widthB));
    let heightA = Math.hypot(tr[0] - br[0], tr[1] - br[1]);
    let heightB = Math.hypot(tl[0] - bl[0], tl[1] - bl[1]);
    let maxHeight = Math.max(Math.floor(heightA), Math.floor(heightB));
    let srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        tl[0], tl[1],
        tr[0], tr[1],
        br[0], br[1],
        bl[0], bl[1]
    ]);
    let dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0,
        maxWidth - 1, 0,
        maxWidth - 1, maxHeight - 1,
        0, maxHeight - 1
    ]);
    let M = cv.getPerspectiveTransform(srcTri, dstTri);
    let dst = new cv.Mat();
    cv.warpPerspective(original, dst, M, new cv.Size(maxWidth, maxHeight));

    ///////////////////////////////// here
    console.log(dst);
    //drawImages([original, dst]);
    return dst;

    // Clean up
    src.delete(); original.delete(); kernel.delete(); mask.delete(); bgdModel.delete(); fgdModel.delete();
    fg.delete(); gray.delete(); contours.delete(); hierarchy.delete(); approx.delete();
    srcTri.delete(); dstTri.delete(); M.delete();
}

// Image align
function aligner(img) {
    delPrevCanvases();
    let src = cv.imread(img);

    // let src = new cv.Mat();
    // cv.cvtColor(img, src, cv.COLOR_RGBA2RGB);        
    let gray = new cv.Mat();
    let edges = new cv.Mat();
    let lines = new cv.Mat();

    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    cv.GaussianBlur(gray, gray, new cv.Size(5, 5), 1.5);
    cv.Canny(gray, edges, 50, 150, 3);
    cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 100, 50, 20);

    let angles = [];
    let positions = [];
    // let lineImg = cv.imread(img); // For visualization
    let lineImg = new cv.Mat();
    cv.cvtColor(src, lineImg, cv.COLOR_RGBA2RGB);

    for (let i = 0; i < lines.rows; i++) {
        let [x1, y1, x2, y2] = lines.data32S.slice(i * 4, i * 4 + 4);
        let dx = x2 - x1, dy = y2 - y1;
        let angle = Math.atan2(dy, dx);
        let deg = angle * 180 / Math.PI;
        // near-horizontal lines
        if (Math.abs(deg) < 15) {
            angles.push(angle);
            positions.push((y1 + y2) / 2);
            // Draw the detected line in green
            cv.line(lineImg, new cv.Point(x1, y1), new cv.Point(x2, y2), new cv.Scalar(0, 255, 0, 255), 2);
        }
    }

    let angleMap = new Array(src.rows).fill(0);
    let weightMap = new Array(src.rows).fill(0);

    for (let i = 0; i < positions.length; i++) {
        let y = Math.floor(positions[i]);
        let a = angles[i];
        for (let dy = -30; dy <= 30; dy++) {
            let yy = y + dy;
            if (yy < 0 || yy >= src.rows) continue;
            let w = Math.exp(-dy * dy / (2 * 30 * 30));
            angleMap[yy] += a * w;
            weightMap[yy] += w;
        }
    }

    console.log(angleMap);

    for (let y = 0; y < src.rows; y++) {
        if (weightMap[y] > 0) {
            angleMap[y] /= weightMap[y];
        } else {
            angleMap[y] = 0;
        }
    }

    let map_x = new cv.Mat(src.rows, src.cols, cv.CV_32FC1);
    let map_y = new cv.Mat(src.rows, src.cols, cv.CV_32FC1);

    for (let y = 0; y < src.rows; y++) {
        let angle = angleMap[y];
        for (let x = 0; x < src.cols; x++) {
            let dx = x - src.cols / 2;
            let newY = y + Math.tan(angle) * dx;
            map_x.floatPtr(y, x)[0] = x;
            map_y.floatPtr(y, x)[0] = Math.max(0, Math.min(src.rows - 1, newY));
        }
    }

    // remap image
    let aligned = new cv.Mat();
    cv.remap(src, aligned, map_x, map_y, cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

    ///////////////////////////////////////////// here
    //drawImages([aligned, lineImg, src, edges]);

    return aligned;
    // Cleanup
    src.delete(); gray.delete(); edges.delete(); lines.delete();
    map_x.delete(); map_y.delete(); aligned.delete();
}

// Helper function
function orderPoints(pts) {
    let rect = [null, null, null, null];
    pts = pts.map(p => [p.x, p.y]);
    let sum = pts.map(p => p[0] + p[1]);
    let diff = pts.map(p => p[0] - p[1]);

    rect[0] = pts[sum.indexOf(Math.min(...sum))];
    rect[2] = pts[sum.indexOf(Math.max(...sum))];
    rect[1] = pts[diff.indexOf(Math.min(...diff))];
    rect[3] = pts[diff.indexOf(Math.max(...diff))];

    return rect;
}

function processCheck(){
    //image = aligner(imgElement);
    //console.log(image)
    socket.emit('process_check',{
        'image':base64Output,
    });
}

// openCV setup
async function onOpenCvReady() { 
    window.cv = await window.cv;
}

fileInput.onchange = function() {
    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.addEventListener(
        "load",
        () => {
        let result = reader.result;
        base64Output = result;
        },
        false,
    );

    if (file) {
        reader.readAsDataURL(file);
    }
};