const devMode = false

const sliderItems = ["distance", "rotatorSize", "ballSize", "speed", "opacity"]
const params = {}

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

        p.preload = () => {
            images["vortex"] = p.loadImage("./images/image.png")
            images["atori"] = p.loadImage("./images/kuratoriatori.png")
        }

        p.setup = () => {
            p.pixelDensity(1)
            p.setFrameRate(60)

            /* スライダ */
            for (const item of sliderItems) {
                const sliderElement = document.getElementById(item)
                const labelElement = document.getElementById(`${item}Label`)
                // 更新時
                sliderElement.addEventListener("input", e => {
                    labelElement.innerText = `${item}: \n${sliderElement.value}`
                    params[item] = sliderElement.value
                })
                // 初期化
                sliderElement.dispatchEvent(new Event("input"))
            }
            /* 間隔の更新時には回転体を再初期化する */
            document.querySelector("#distance").addEventListener("input", e => {
                setRotators()
            })

            // 画像切り替え
            const imageSelectElement = document.querySelector("#imageSelect")
            imageSelectElement.addEventListener("change", e => {
                const imageSelectOptions = Array.from(document.querySelectorAll("#imageSelect input[type=radio]"))
                const selected = imageSelectOptions.filter(option => option.checked)[0].value
                changeImageRoutine(selected)
            })
            imageSelectElement.dispatchEvent(new Event("change"))

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
            document.querySelector("#gifSave1r").addEventListener("click", e => {
                if (params.speed != 0) {
                    p.saveGif('savedGIF.gif', Math.round(Math.PI * 2 / params.speed), { units: "frames", delay: 3 })
                }
            })
            document.querySelector("#gifSave1s").addEventListener("click", e => {
                p.saveGif('savedGIF.gif', 1, { delay: 3 })
            })
            p.background(0)
        }

        p.draw = () => {
            p.blendMode(p.BLEND)
            if (document.querySelector("#trace").checked) {
                p.background(16, 32)
            } else {
                p.background(16)
            }

            // 押下時の処理
            const mouseInCanvas = () => {
                const xInCanvas = 0 < p.mouseX && p.mouseX < p.width
                const yInCanvas = 0 < p.mouseY && p.mouseY < p.height
                return xInCanvas && yInCanvas
            }
            if (p.mouseIsPressed && mouseInCanvas()) {
                rotators.forEach(rotator => rotator.enabled = false)
                rotators[0].enabled = true
                rotators[0].position = [p.mouseX, p.mouseY]
            } else {
                rotators[0].position = rotators[0].initialPosition
                rotators.forEach(rotator => rotator.enabled = true)
            }
            // ボールを更新
            rotators.forEach(rotator => rotator.update())

            // ボールを描画
            //合成モード適用
            const blendMode = Array.from(document.querySelectorAll("#blendMode input[type=radio]")).filter(option => option.checked)[0].value
            p.blendMode(p[blendMode])
            p.noStroke()
            p.ellipseMode(p.RADIUS)
            rotators.forEach(rotator => rotator.draw())

            if (devMode) {
                p.fill(255)
                p.textSize(16)
                p.text(`fps: ${Math.round(p.frameRate())}`, 10, 20)
            }
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
            setRotators()
        }

        const setRotators = () => {
            rotators.length = 0
            rotatorRows = Math.ceil((p.height - 1 / 2 * +params.distance) / +params.distance) //端から半単位離す
            rotatorColumns = Math.ceil((p.width - 1 / 2 * +params.distance) / +params.distance)
            rotatorNum = rotatorRows * rotatorColumns

            for (let i = 0; i < rotatorNum; i++) {
                const position = [
                    1 / 2 * params.distance + (i % rotatorColumns) * params.distance,
                    1 / 2 * params.distance + Math.trunc(i / rotatorColumns) * params.distance
                ]
                const initOption = {
                    position: position,
                }
                rotators.push(new Rotator(initOption))
            }
        }

        class Rotator {
            constructor(options) {
                //角度
                this.angle = Math.random() * Math.PI * 2

                //座標
                this.position = options.position ?? [p.width / 2, p.height / 2]
                this.initialPosition = [...this.position]
                this.ballPositions = []
                this.ballPositionsInt = []

                this.enabled = true
            }
            update() {
                this.angle += +params.speed

                const radius = params.rotatorSize

                const pixelIndexes = []
                const pos2index = ([x, y]) => { return (x + y * img.width) * 4 }

                for (let i = 0; i < 3; i++) {
                    this.ballPositions[i] = [
                        this.position[0] + radius * Math.cos(+this.angle + i * Math.PI * 2 / 3),
                        this.position[1] + radius * Math.sin(+this.angle + i * Math.PI * 2 / 3)
                    ]
                    // 色取得用の整数座標
                    this.ballPositionsInt[i] = [
                        Math.round(this.ballPositions[i][0]),
                        Math.round(this.ballPositions[i][1])
                    ]

                    pixelIndexes[i] = pos2index(this.ballPositionsInt[i])
                }

                // RGBそれぞれの座標の色を格納
                this.color = [
                    pixels[pixelIndexes[0]],
                    pixels[pixelIndexes[1] + 1],
                    pixels[pixelIndexes[2] + 2],
                ]
            }
            draw() {
                if (!this.enabled) return
                //回転体を描画
                this.color.forEach((c, i) => {
                    const fill = [0, 0, 0]
                    fill[i] = c
                    fill.push(+params.opacity)
                    p.fill(fill)
                    const x = this.ballPositions[i][0]
                    const y = this.ballPositions[i][1]
                    const ballSize = params.ballSize * c / 100
                    p.ellipse(x, y, ballSize)
                })

            }
        }
    }
)

