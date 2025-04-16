Описание работы предобработки изображения

Цель предобработки:
    Получение изображения чека для дальнейшего распознавания текста


Функция extractImage() выполняет автоматическое выделение и выравнивание объекта на изображении

### Загрузка изображения и подготовка
```javascript
let src = cv.imread(img);
let original = new cv.Mat();
cv.cvtColor(src, src, cv.COLOR_RGBA2RGB);
cv.cvtColor(src, original, cv.COLOR_RGBA2RGB);
```
cv.imread(img) — загружает изображения в объект Mat.
<br>
Преобразование RGBA в RGB избавляет от альфа-канала.
<br>
original — копия исходного изображения для финальной трансформации.

### Морфологическая фильтрация
```javascript
cv.morphologyEx(src, src, cv.MORPH_CLOSE, kernel);
```
Морфологическая операция помогает устранить шум и объединить разорванные контуры, заполняя мелкие пробелы.

### Разделение переднего и заднего плана (GrabCut)
```javascript
let mask = new cv.Mat.zeros(src.rows, src.cols, cv.CV_8U);
let bgdModel = new cv.Mat();
let fgdModel = new cv.Mat();
let rect = new cv.Rect(50, 50, src.cols - 70, src.rows - 70);
cv.grabCut(src, mask, rect, bgdModel, fgdModel, 5, cv.GC_INIT_WITH_RECT);
```
Алгоритм GrabCut выделяет передний план (чек) от фона.
<br>
mask и модели bgdModel и fgdModel управляют сегментацией.
<br>
rect — прямоугольная область, в которой предположительно находится объект интереса (чек).

### Маска
```javascript
for (...) {
    mask.ucharPtr(i, j)[0] = (val === 2 || val === 0) ? 0 : 255;
}
```
Маска преобразуется в фильтр: пиксели, не принадлежащие объекту интереса (чеку) (val = 0 или 2), становятся чёрными (0), остальные — белыми (255).
<br>
Получаем чёрно-белую маску переднего плана.

### Выделение объекта по маске
```javascript
cv.bitwise_and(src, src, fg, mask);
```
Маска накладывается на изображение, удаляя фон и оставляя только передний план (чек).

### Контурный анализ
```javascript
cv.cvtColor(fg, gray, cv.COLOR_RGBA2GRAY);
cv.GaussianBlur(gray, gray, new cv.Size(11, 11), 0);
```
Полученное изображение преобразуется в оттенки серого.
<br>
Применяется размытие, чтобы уменьшить шум перед поиском контуров.

```javascript
let contours = new cv.MatVector();
let hierarchy = new cv.Mat();
cv.findContours(gray, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
```
Находятся внешние контуры на изображении.

```javascript
for (...) {
    cv.approxPolyDP(c, approx, 0.02 * peri, true);
    if (approx.rows === 4) break;
}
```
При помощи алгоритма Рамера (Дугласа - Пекера) находится границы контуры чека.
<br>
approxPolyDP используется для аппроксимации контура: если найден четырёхугольник (4 точки), то это может быть документ.

### Упорядочивание точек и расчёт размеров
```javascript
let points = [...]; // Сбор координат 4 точек
let ordered = orderPoints(points); // Упорядочиваем как tl, bl, br, tr
```
Так как мы не можем быть уверены, что точки углов чека расположены в нужном нам порядке, то используется функция orderPoints. Она сортирует точки в порядке против часовой стрелки начиная с верхнего левого угла.

```javascript
let widthA = Math.hypot(br[0] - bl[0], br[1] - bl[1]);
let widthB = Math.hypot(tr[0] - tl[0], tr[1] - tl[1]);
let maxWidth = Math.max(Math.floor(widthA), Math.floor(widthB));

let heightA = Math.hypot(tr[0] - br[0], tr[1] - br[1]);
let heightB = Math.hypot(tl[0] - bl[0], tl[1] - bl[1]);
let maxHeight = Math.max(Math.floor(heightA), Math.floor(heightB));
```
По найденным углам рассчитывается ширина и высота изображения чека. На их основе, к оригинальному изображению применяется трансформация перспективы.

### Перспективное преобразование
```javascript
let M = cv.getPerspectiveTransform(srcTri, dstTri);
cv.warpPerspective(original, dst, M, new cv.Size(maxWidth, maxHeight));
```
Создаём матрицу преобразования перспективы.
<br>
Применяем её к оригинальному изображению для получения изображение минимальными искажениями, вызванными поворотом относительно камеры и параллаксом.

