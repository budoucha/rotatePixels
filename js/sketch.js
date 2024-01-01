const sliderItems = ["distance", "rotatorSize", "ballSize", "speed", "opacity"]

const p = new p5(
    p => {
        let canvas
        const rotators = [] //縦横に等間隔に配置されるRotatorが入る
        let img
        let images = []
        let pixels = []

        let rotatorNum
        let rotatorRows
        let rotatorColumns
        let distance = document.querySelector("#distance").value
        let rotatorSize = document.querySelector("#rotatorSize").value
        let ballSize = document.querySelector("#ballSize").value
        let speed = document.querySelector("#speed").value

        p.preload = () => {
            images["vortex"] = p.loadImage("./images/image.png")
            images["atori"] = p.loadImage("./images/kuratoriatori.png")
        }

        /* 画像を変更したらしたら毎回行う */
        const changeImageRoutine = (selected) => {
            img = images[selected]
            const width = Math.min(window.innerWidth, 640)
            img.resize(width, 0)
            img.loadPixels()
            pixels = img.pixels
            canvas = p.createCanvas(width, img.height / img.width * width)
            canvas.parent("canvasContainer")
        }

        p.setup = () => {
            p.pixelDensity(1)
            p.setFrameRate(60)

            const imageSelectOptions = Array.from(document.querySelectorAll("#imageSelect input[type=radio]"))
            const selected = imageSelectOptions.filter(option => option.checked)[0].value
            changeImageRoutine(selected)

            // 画像切り替え
            document.querySelector("#imageSelect").addEventListener("change", e => {
                const imageSelectOptions = Array.from(document.querySelectorAll("#imageSelect input[type=radio]"))
                const selected = imageSelectOptions.filter(option => option.checked)[0].value
                changeImageRoutine(selected)
            })

            // 回転体初期化
            setRotators()

            /* ラベル初期化 */
            for (const item of sliderItems) {
                const element = document.getElementById(item)
                const labelElement = document.getElementById(`${item}Label`)
                labelElement.innerText = `${item}: \n${element.value}`
            }

            /* 間隔の更新 */
            document.querySelector("#distance").addEventListener("input", e => {
                distance = document.querySelector("#distance").value
                rotators.length = 0
                setRotators()
            })

            /* ファイル選択 */
            const handleFile = (e) => {
                const file = e.target.files[0]
                if (file && file.type.startsWith('image/')) {
                    images["user"] = p.loadImage(URL.createObjectURL(file),
                        () => {
                            // ラジオボタンジャマーキャンセラー
                            document.querySelector("#imageSelect>[name=image][value=user]").disabled = false
                        })
                } else {
                    console.log("Something went wrong.")
                }
            }
            const fileSelectElement = document.querySelector("#fileSelect")
            fileSelectElement.addEventListener('change', handleFile)

            // GIF保存ボタン
            document.querySelector("#gifSave05").addEventListener("click", e => {
                p.saveGif('savedGIF.gif', 0.5, { delay: 3 })
            })
            document.querySelector("#gifSave1").addEventListener("click", e => {
                p.saveGif('savedGIF.gif', 1, { delay: 3 })
            })
            document.querySelector("#gifSave3").addEventListener("click", e => {
                p.saveGif('savedGIF.gif', 3, { delay: 3 })
            })
            p.background(0)
        }

        p.draw = () => {
            p.blendMode(p.BLEND)
            if (document.querySelector("#trace").checked) {
                p.background(16, 8)
            } else {
                p.background(16)
            }
            if (p.frameCount % 60 == 0) {
                // console.log(`fps: ${p.frameRate()}`)
            }

            // 速度を更新
            speed = document.querySelector("#speed").value

            // ボールを更新
            rotators.forEach(rotator => rotator.update())

            // ボールを描画
            p.noStroke()
            p.ellipseMode(p.RADIUS)
            rotators.forEach(rotator => rotator.draw())
        }

        const setRotators = () => {
            rotatorRows = Math.ceil((p.width - 1 / 2 * distance) / distance) //端から半単位離す
            rotatorColumns = Math.ceil((p.height - 1 / 2 * distance) / distance)
            rotatorNum = rotatorRows * rotatorColumns

            for (let i = 0; i < rotatorNum; i++) {
                const position = [
                    1 / 2 * distance + (i % rotatorColumns) * distance,
                    1 / 2 * distance + Math.trunc(i / rotatorColumns) * distance
                ]
                const initOption = {
                    position: position,
                    rotatorSize: rotatorSize,
                    ballSize: ballSize,
                }
                rotators.push(new Rotator(initOption))
            }
        }

        class Rotator {
            constructor(options) {
                //角度
                this.angle = 0
                //角速度
                this.speed = speed

                //半径
                this.rotatorSize = +rotatorSize
                this.ballSize = +ballSize

                //座標
                this.position = options.position ?? [p.width / 2, p.height / 2]
                this.initialPosition = [...this.position]

                //縦横の番号を設定
                // 隣の回転体と相互作用する何かを後で作る気がする
                // this.row = options.row ?? 0
                // this.column = options.column ?? 0
            }
            update() {
                this.angle += +this.speed

                const mouseInCanvas = () => {
                    const xInCanvas = 0 < p.mouseX && p.mouseX < p.width
                    const yInCanvas = 0 < p.mouseY && p.mouseY < p.height
                    return xInCanvas && yInCanvas
                }
                // マウス押下
                if (p.mouseIsPressed && mouseInCanvas()) {
                    this.position = [p.mouseX, p.mouseY]
                }
                else {
                    this.position = [...this.initialPosition]
                }
                // スライダーの値を取得
                for (const item of sliderItems) {
                    this[item] = document.querySelector(`#${item}`).value
                }

                // 色取得用の整数座標
                const positionIntX = Math.round(this.position[0])
                const positionIntY = Math.round(this.position[1])

                // 現在位置の画素の色を取得
                const pos2index = (x, y) => { return (x + y * img.width) * 4 }
                const pixelIndex = pos2index(positionIntX, positionIntY)
                this.color = [
                    pixels[pixelIndex],
                    pixels[pixelIndex + 1],
                    pixels[pixelIndex + 2],
                ]
            }
            draw() {
                p.noStroke()
                //合成モード適用
                const blendMode = Array.from(document.querySelectorAll("#blendMode input[type=radio]")).filter(option => option.checked)[0].value
                p.blendMode(p[blendMode])

                //回転体を描画
                this.color.forEach((c, i) => {
                    let fill = [0, 0, 0]
                    fill[i] = c
                    const opacity = +document.querySelector("#opacity").value
                    fill.push(opacity)
                    p.fill(fill)
                    const radius = this.rotatorSize
                    const ballSize = this.ballSize * c / 100
                    const x = this.position[0] + radius * Math.cos(+this.angle + i * Math.PI * 2 / 3)
                    const y = this.position[1] + radius * Math.sin(+this.angle + i * Math.PI * 2 / 3)
                    p.ellipse(x, y, ballSize)
                })

            }
        }

        p.mmouseClicked = () => {
            console.log(
                rotators[0]
            )
        }
    }
)

/* ラベル書き換え用 */
for (const item of sliderItems) {
    const element = document.getElementById(item)
    const labelElement = document.getElementById(`${item}Label`)
    element.addEventListener("input", e => {
        labelElement.innerText = `${item}: \n${element.value}`
    })
}
