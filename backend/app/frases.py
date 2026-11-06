"""Frases enlatadas para cuando Claude no responde o no puede responder."""

import random

SIN_CEREBRO = [
    "¡Uy! Se me desconectó el cerebro un segundito. ¿Me lo repetís?",
    "Perdón, estaba pensando tan fuerte que se me trabó todo. ¿Otra vez?",
    "¡Ay no, me dio un mini apagón! Preguntame de nuevo, porfa.",
]

REDIRECCION = [
    "¡Uh, eso no lo puedo hacer, me explotan los circuitos! ¿Y si mejor te programo un juego?",
    "De eso no hablo, que soy un robot de familia. ¿Querés que te cuente un chiste?",
]

ARRANCO_A_PROGRAMAR = [
    "¡Dale! Me pongo a programar... ¡pero no me miren que me pongo nervioso!",
    "¡Un juego! Ya arranco, ya arranco. Nadie me mire los dedos.",
]


OCUPADO = [
    "¡Pará, pará! Todavía estoy terminando el otro juego. Un ratito y lo vemos.",
    "¡Uno a la vez, que tengo dos manos nomás! Dejame terminar este juego primero.",
]


SIN_CEREBRO_CON_JUEGO = [
    "¡Mi cerebro está desenchufado! Pero me sé un juego de memoria, ya lo escribo.",
    "Se me cortó la conexión con la nube, ¡pero tengo un juego guardado en el bolsillo!",
]


def una(frases: list[str]) -> str:
    return random.choice(frases)
