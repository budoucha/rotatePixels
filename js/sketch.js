const devMode = false

const sliderItems = ["distance", "rotatorSize", "ballSize", "speed", "opacity"]
const radioItems = ["blendMode", "selectedImage"]
const checkboxItems = ["trace", "useRawSpeed"]
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

            /* ラジオボタン共通処理 */
            for (const item of radioItems) {
                const radioElement = document.querySelector(`#${item}`)
                radioElement.addEventListener("change", e => {
                    const options = Array.from(document.querySelectorAll(`#${item} input[type=radio]`))
                    params[item] = options.filter(option => option.checked)[0].value
                })
                // 初期化
                radioElement.dispatchEvent(new Event("change"))
                console.log(params[item])
            }

            /* チェックボックス共通処理 */
            for (const item of checkboxItems) {
                const checkboxElement = document.getElementById(item)
                checkboxElement.addEventListener("change", e => {
                    params[item] = checkboxElement.checked
                })
                checkboxElement.dispatchEvent(new Event("change"))
            }

            /* スライダ共通処理 */
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
            /* 角速度の再設定 */
            const rawSpeedElements = [document.querySelector("#rotatorSize"), document.querySelector("#speed")]
            const switchSpeedMode = () => {
                // この係数はrotatorSizeの初期値にしておく
                params.rawSpeed = 10 * params.speed / params.rotatorSize
            }
            rawSpeedElements.forEach(element => element.addEventListener("input", switchSpeedMode))
            switchSpeedMode()
            // 画像切り替え時はchangeImageRoutineを呼ぶ 
            document.querySelector("#selectedImage").addEventListener("change", changeImageRoutine)
            changeImageRoutine()

            document.querySelector("#copyParams").addEventListener("click", e => {
                const paramsString = JSON.stringify(params)
                const isValid = isValidParams(paramsString)
                if (!isValid[0]) {
                    notify(`Error: ${isValid[1]}`, "error")
                    return
                }
                navigator.clipboard.writeText(paramsString).then(() => {
                    notify("Copied!", "copied")
                }).catch(err => {
                    notify("Failed to copy", "error")
                })
            })

            document.querySelector("#pasteParams").addEventListener("click", async (e) => {
                // クリップボード取得
                const getClipboard = async () => {
                    const text = await navigator.clipboard.readText()
                    return text
                }

                let clipboard = ""
                try {
                    clipboard = await getClipboard()
                } catch (err) {
                    notify("Failed to get clipboard", "error")
                    return
                }
                console.log(clipboard)

                const isValid = isValidParams(clipboard)
                if (!isValid[0]) {
                    notify(`Error: ${isValid[1]}`, "error")
                    return
                }
                // パラメータの上書き
                console.log(params)
                Object.assign(params, JSON.parse(clipboard))
                console.log(params)

                // input要素の更新
                reflectToInputs()
                notify("Pasted!", "pasted")
            })

            /* ファイル選択 */
            const handleFile = (e) => {
                const file = e.target.files[0]
                if (file && file.type.startsWith('image/')) {
                    images["user"] = p.loadImage(URL.createObjectURL(file),
                        () => {
                            // ラジオボタンジャマーキャンセラー
                            document.querySelector("#selectedImage>[name=image][value=user]").disabled = false
                        })
                } else {
                    console.log("Something went wrong.")
                }
            }
            const fileSelectElement = document.querySelector("#fileSelect")
            fileSelectElement.addEventListener('change', handleFile)

            // GIF保存ボタン
            const setSave1rButton = () => {
                if (params.useRawSpeed && params.rawSpeed != 0) {
                    p.saveGif('savedGIF.gif', Math.round(Math.PI * 2 / params.rawSpeed), { units: "frames", delay: 3 })
                } else if (params.speed != 0) {
                    p.saveGif('savedGIF.gif', Math.round(Math.PI * 2 / params.speed), { units: "frames", delay: 3 }, { delay: 3 })
                }
            }
            document.querySelector("#gifSave1r").addEventListener("click", setSave1rButton)
            document.querySelector("#gifSave1s").addEventListener("click", e => {
                p.saveGif('savedGIF.gif', 1, { delay: 3 })
            })
            p.background(0)
        }

        p.draw = () => {
            p.blendMode(p.BLEND)
            if (params.trace) {
                p.background(16, 16)
            } else {
                p.background(16)
            }

            // ボールを更新
            rotators.forEach(rotator => rotator.update())

            // ボールを描画
            //合成モード適用
            p.blendMode(p[params.blendMode])
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
        const changeImageRoutine = () => {
            img = images[params.selectedImage]
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
                if (params.useRawSpeed) {
                    this.angle -= params.rawSpeed
                } else {
                    this.angle -= params.speed
                }
                this.angle %= Math.PI * 2
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

        const notify = (message, status) => {
            const overlayElement = document.querySelector(".overlay")
            overlayElement.innerHTML = message
            overlayElement.classList.add("active", status)
            setTimeout(() => {
                overlayElement.classList.remove("active", status)
            }, 1000)
        }

        const isValidParams = (input) => {
            let inputObj = {}
            try {
                inputObj = JSON.parse(input)
            } catch (err) {
                return [false, "not Object"]
            }
            if (Object.keys(inputObj).length == 0) {
                return [false, "empty Object"]
            }
            return [true, "OK"]
        }

        const reflectToInputs = () => {
            sliders.forEach(slider => {
                document.getElementById(slider).value = params[slider]
            })
            radios.forEach(radio => {
                document.getElementById(radio).value = params[radio]
            })
            checkboxes.forEach(checkbox => {
                document.getElementById(checkbox).checked = params[checkbox]
            })
        }

    }
)

