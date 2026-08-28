document.addEventListener("DOMContentLoaded", () => {

    const gridDisplay = document.querySelector(".grid")
    const scoreDisplay = document.querySelector("#score")
    const resultDisplay = document.querySelector("#result")

    const width = 4

    let squares = []
    let score = 0


    // =========================================================
    // INTEGRACION CON STEAM - LOGROS
    // =========================================================

    // Cuando Steam abra el juego deberá hacerlo así:
    //
    // /juegos/2048/index.html?usuario_id=1&juego_id=2
    //
    // De esa forma sabemos qué usuario está jugando
    // y qué juego corresponde al 2048.

    const parametros = new URLSearchParams(window.location.search)

    const usuarioId = parametros.get("usuario_id")
    const juegoId = parametros.get("juego_id")


    // Evita intentar desbloquear el mismo logro
    // muchas veces durante la misma partida.
    const logrosSolicitados = new Set()


    async function obtenerLogrosDelJuego() {

        if (!juegoId) {
            console.log("No se recibió juego_id.")
            return []
        }

        try {

            const respuesta = await fetch(
                `/juegos/${juegoId}/logros`
            )

            if (!respuesta.ok) {
                console.log("No se pudieron obtener los logros.")
                return []
            }

            return await respuesta.json()

        } catch (error) {

            console.error(
                "Error obteniendo logros:",
                error
            )

            return []
        }
    }


    async function desbloquearLogro(nombreLogro) {

        if (!usuarioId || !juegoId) {
            console.log(
                "El juego fue abierto sin usuario_id o juego_id."
            )
            return
        }


        // Si ya lo intentamos durante esta partida,
        // no volvemos a enviarlo.
        if (logrosSolicitados.has(nombreLogro)) {
            return
        }

        logrosSolicitados.add(nombreLogro)


        try {

            // Buscamos los logros que existen
            // para este juego en la base de datos.
            const logros = await obtenerLogrosDelJuego()


            // Buscamos el logro por nombre.
            const logro = logros.find(
                logro => logro.nombre === nombreLogro
            )


            if (!logro) {

                console.log(
                    `No existe el logro "${nombreLogro}" en la base de datos.`
                )

                return
            }


            // Llamamos a la HU9 del backend.
            const respuesta = await fetch(
                `/usuarios/${usuarioId}/logros/${logro.id}`,
                {
                    method: "POST"
                }
            )


            if (respuesta.ok) {

                console.log(
                    `Logro desbloqueado: ${nombreLogro}`
                )

                mostrarLogro(nombreLogro)

                return
            }


            const error = await respuesta.json()


            // Si ya estaba desbloqueado no pasa nada.
            console.log(
                error.detail || "No se pudo desbloquear el logro."
            )


        } catch (error) {

            console.error(
                "Error desbloqueando logro:",
                error
            )
        }
    }


    // Mensaje visual cuando se consigue un logro.
    function mostrarLogro(nombreLogro) {

        const mensaje = document.createElement("div")

        mensaje.innerHTML = `
            LOGRO DESBLOQUEADO<br>
            <strong>${nombreLogro}</strong>
        `

        mensaje.style.position = "fixed"
        mensaje.style.bottom = "30px"
        mensaje.style.right = "30px"
        mensaje.style.background = "#171a21"
        mensaje.style.color = "white"
        mensaje.style.padding = "18px 25px"
        mensaje.style.borderRadius = "6px"
        mensaje.style.fontFamily = "Arial, sans-serif"
        mensaje.style.fontSize = "16px"
        mensaje.style.zIndex = "9999"
        mensaje.style.boxShadow = "0 0 15px rgba(0,0,0,0.5)"

        document.body.appendChild(mensaje)


        setTimeout(() => {
            mensaje.remove()
        }, 4000)
    }



    // =========================================================
    // CREAR TABLERO
    // =========================================================

    function createBoard() {

        for (let i = 0; i < width * width; i++) {

            const square = document.createElement("div")

            square.innerHTML = 0

            gridDisplay.appendChild(square)

            squares.push(square)
        }

        generate()
        generate()
    }

    createBoard()



    // =========================================================
    // GENERAR NUEVO NUMERO
    // =========================================================

    function generate() {

        const randomNumber =
            Math.floor(Math.random() * squares.length)

        if (squares[randomNumber].innerHTML == 0) {

            squares[randomNumber].innerHTML = 2

            checkForGameOver()

        } else {

            generate()
        }
    }



    // =========================================================
    // MOVIMIENTO DERECHA
    // =========================================================

    function moveRight() {

        for (let i = 0; i < 16; i++) {

            if (i % 4 === 0) {

                let totalOne = squares[i].innerHTML
                let totalTwo = squares[i + 1].innerHTML
                let totalThree = squares[i + 2].innerHTML
                let totalFour = squares[i + 3].innerHTML

                let row = [
                    parseInt(totalOne),
                    parseInt(totalTwo),
                    parseInt(totalThree),
                    parseInt(totalFour)
                ]

                let filteredRow =
                    row.filter(num => num)

                let missing =
                    4 - filteredRow.length

                let zeros =
                    Array(missing).fill(0)

                let newRow =
                    zeros.concat(filteredRow)

                squares[i].innerHTML = newRow[0]
                squares[i + 1].innerHTML = newRow[1]
                squares[i + 2].innerHTML = newRow[2]
                squares[i + 3].innerHTML = newRow[3]
            }
        }
    }



    // =========================================================
    // MOVIMIENTO IZQUIERDA
    // =========================================================

    function moveLeft() {

        for (let i = 0; i < 16; i++) {

            if (i % 4 === 0) {

                let totalOne = squares[i].innerHTML
                let totalTwo = squares[i + 1].innerHTML
                let totalThree = squares[i + 2].innerHTML
                let totalFour = squares[i + 3].innerHTML

                let row = [
                    parseInt(totalOne),
                    parseInt(totalTwo),
                    parseInt(totalThree),
                    parseInt(totalFour)
                ]

                let filteredRow =
                    row.filter(num => num)

                let missing =
                    4 - filteredRow.length

                let zeros =
                    Array(missing).fill(0)

                let newRow =
                    filteredRow.concat(zeros)

                squares[i].innerHTML = newRow[0]
                squares[i + 1].innerHTML = newRow[1]
                squares[i + 2].innerHTML = newRow[2]
                squares[i + 3].innerHTML = newRow[3]
            }
        }
    }



    // =========================================================
    // MOVIMIENTO ARRIBA
    // =========================================================

    function moveUp() {

        for (let i = 0; i < 4; i++) {

            let totalOne = squares[i].innerHTML
            let totalTwo = squares[i + width].innerHTML
            let totalThree = squares[i + width * 2].innerHTML
            let totalFour = squares[i + width * 3].innerHTML

            let column = [
                parseInt(totalOne),
                parseInt(totalTwo),
                parseInt(totalThree),
                parseInt(totalFour)
            ]

            let filteredColumn =
                column.filter(num => num)

            let missing =
                4 - filteredColumn.length

            let zeros =
                Array(missing).fill(0)

            let newColumn =
                filteredColumn.concat(zeros)

            squares[i].innerHTML = newColumn[0]
            squares[i + width].innerHTML = newColumn[1]
            squares[i + width * 2].innerHTML = newColumn[2]
            squares[i + width * 3].innerHTML = newColumn[3]
        }
    }



    // =========================================================
    // MOVIMIENTO ABAJO
    // =========================================================

    function moveDown() {

        for (let i = 0; i < 4; i++) {

            let totalOne = squares[i].innerHTML
            let totalTwo = squares[i + width].innerHTML
            let totalThree = squares[i + width * 2].innerHTML
            let totalFour = squares[i + width * 3].innerHTML

            let column = [
                parseInt(totalOne),
                parseInt(totalTwo),
                parseInt(totalThree),
                parseInt(totalFour)
            ]

            let filteredColumn =
                column.filter(num => num)

            let missing =
                4 - filteredColumn.length

            let zeros =
                Array(missing).fill(0)

            let newColumn =
                zeros.concat(filteredColumn)

            squares[i].innerHTML = newColumn[0]
            squares[i + width].innerHTML = newColumn[1]
            squares[i + width * 2].innerHTML = newColumn[2]
            squares[i + width * 3].innerHTML = newColumn[3]
        }
    }



    // =========================================================
    // COMBINAR FILAS
    // =========================================================

    function combineRow() {

        for (let i = 0; i < 15; i++) {

            if (
                squares[i].innerHTML ===
                squares[i + 1].innerHTML
            ) {

                let combinedTotal =
                    parseInt(squares[i].innerHTML) +
                    parseInt(squares[i + 1].innerHTML)

                squares[i].innerHTML =
                    combinedTotal

                squares[i + 1].innerHTML = 0

                score += combinedTotal

                scoreDisplay.innerHTML = score
            }
        }

        checkForAchievements()
    }



    // =========================================================
    // COMBINAR COLUMNAS
    // =========================================================

    function combineColumn() {

        for (let i = 0; i < 12; i++) {

            if (
                squares[i].innerHTML ===
                squares[i + width].innerHTML
            ) {

                let combinedTotal =
                    parseInt(squares[i].innerHTML) +
                    parseInt(squares[i + width].innerHTML)

                squares[i].innerHTML =
                    combinedTotal

                squares[i + width].innerHTML = 0

                score += combinedTotal

                scoreDisplay.innerHTML = score
            }
        }

        checkForAchievements()
    }



    // =========================================================
    // CONTROLES
    // =========================================================

    function control(e) {

        if (e.key === "ArrowLeft") {

            keyLeft()

        } else if (e.key === "ArrowRight") {

            keyRight()

        } else if (e.key === "ArrowUp") {

            keyUp()

        } else if (e.key === "ArrowDown") {

            keyDown()
        }
    }


    document.addEventListener(
        "keydown",
        control
    )



    function keyLeft() {

        moveLeft()

        combineRow()

        moveLeft()

        generate()
    }


    function keyRight() {

        moveRight()

        combineRow()

        moveRight()

        generate()
    }


    function keyUp() {

        moveUp()

        combineColumn()

        moveUp()

        generate()
    }


    function keyDown() {

        moveDown()

        combineColumn()

        moveDown()

        generate()
    }



    // =========================================================
    // LOGROS DEL 2048
    // =========================================================

    function checkForAchievements() {

        let valores =
            squares.map(
                square => parseInt(square.innerHTML)
            )


        // LOGRO 1
        // Llegar a 128

        if (valores.some(valor => valor >= 128)) {

            desbloquearLogro(
                "Primeros pasos"
            )
        }


        // LOGRO 2
        // Llegar a 512

        if (valores.some(valor => valor >= 512)) {

            desbloquearLogro(
                "Buen jugador"
            )
        }


        // LOGRO 3
        // Llegar a 2048

        if (valores.some(valor => valor >= 2048)) {

            desbloquearLogro(
                "Maestro del 2048"
            )

            checkForWin()
        }
    }



    // =========================================================
    // GANAR
    // =========================================================

    function checkForWin() {

        for (let i = 0; i < squares.length; i++) {

            if (squares[i].innerHTML == 2048) {

                resultDisplay.innerHTML =
                    "You WIN!"

                document.removeEventListener(
                    "keydown",
                    control
                )

                setTimeout(
                    clear,
                    3000
                )

                return
            }
        }
    }



    // =========================================================
    // PERDER
    // =========================================================

    function checkForGameOver() {

        let zeros = 0

        for (let i = 0; i < squares.length; i++) {

            if (squares[i].innerHTML == 0) {

                zeros++
            }
        }


        if (zeros === 0) {

            resultDisplay.innerHTML =
                "You LOSE!"

            document.removeEventListener(
                "keydown",
                control
            )

            setTimeout(
                clear,
                3000
            )
        }
    }



    function clear() {

        clearInterval(myTimer)
    }



    // =========================================================
    // COLORES
    // =========================================================

    function addColours() {

        for (let i = 0; i < squares.length; i++) {

            if (squares[i].innerHTML == 0)
                squares[i].style.backgroundColor = "#afa192"

            else if (squares[i].innerHTML == 2)
                squares[i].style.backgroundColor = "#eee4da"

            else if (squares[i].innerHTML == 4)
                squares[i].style.backgroundColor = "#ede0c8"

            else if (squares[i].innerHTML == 8)
                squares[i].style.backgroundColor = "#f2b179"

            else if (squares[i].innerHTML == 16)
                squares[i].style.backgroundColor = "#ffcea4"

            else if (squares[i].innerHTML == 32)
                squares[i].style.backgroundColor = "#e8c064"

            else if (squares[i].innerHTML == 64)
                squares[i].style.backgroundColor = "#ffab6e"

            else if (squares[i].innerHTML == 128)
                squares[i].style.backgroundColor = "#fd9982"

            else if (squares[i].innerHTML == 256)
                squares[i].style.backgroundColor = "#ead79c"

            else if (squares[i].innerHTML == 512)
                squares[i].style.backgroundColor = "#76daff"

            else if (squares[i].innerHTML == 1024)
                squares[i].style.backgroundColor = "#beeaa5"

            else if (squares[i].innerHTML == 2048)
                squares[i].style.backgroundColor = "#d7d4f0"
        }
    }


    addColours()


    let myTimer =
        setInterval(
            addColours,
            50
        )

})