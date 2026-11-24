"""
Scripted roleplay content for the Gemini Live stub.

SCRIPTS[language][mission title] = {
    "turns": [("user", text) | ("model", text) | ("model", (text, teacher_note))],
    "feedback":  3 immersive-mode pointers (learner's native language: English),
    "takeaways": 3 teacher-mode takeaways,
    "score": optional fixed immersive score (1-3)
}
Teacher notes are only spoken in Teacher mode (where transcripts are shown).
More languages live in dialogues_extra.py.
"""
import random

SCRIPTS = {
    "Spanish": {
        "Say Hello": {
            "turns": [
                ("user", "¡Hola! Buenas tardes. Me llamo Sam, soy el nuevo vecino del tercero B."),
                ("model", ("¡Ay, hola, hola! ¡Por fin te conozco! Yo soy Carmen, del tercero A, justo enfrente. ¡Bienvenido al edificio! ¿Qué tal la mudanza?",
                           "Nice! 'Mudanza' means 'the move', as in moving house. She's asking how the move went.")),
                ("user", "Bien, bien, pero estoy un poco cansado. Hay muchas cajas todavía."),
                ("model", ("¡Normal, normal! Oye, si necesitas algo, sal, azúcar, un destornillador… tú llama a mi puerta, ¿eh? ¿Y tú cómo estás, aparte de cansado?",
                           "Great use of 'todavía' — 'still'. Quick check: how would you say 'I'm very happy to be here'?")),
                ("user", "Estoy muy contento de estar aquí. El barrio es muy bonito."),
                ("model", ("¡Qué bien! Pues mañana te traigo una tortilla de patatas para celebrar. ¡Encantada, Sam!",
                           "Perfect sentence! 'Encantada' is what she says because she's a woman — you'd say 'encantado'.")),
                ("user", "¡Muchas gracias, Carmen! Encantado. Hasta luego."),
                ("model", ("¡Hasta luego, vecino! Bienvenido al barrio.",
                           "¡Muy bien! Well done — you introduced yourself and asked how she was.")),
            ],
            "feedback": [
                "Great natural greeting — 'Buenas tardes' fit the time of day perfectly.",
                "Nice use of 'todavía' to explain the unfinished move.",
                "Remember to ask the other person back sooner: '¿Y tú, qué tal?' keeps the conversation balanced.",
            ],
            "takeaways": [
                "'Mudanza' = a house move; 'mudarse' = to move house.",
                "Use 'encantado' (male speaker) / 'encantada' (female speaker) for 'nice to meet you'.",
                "'Estar contento de + infinitive' — 'Estoy contento de estar aquí'.",
            ],
        },
        "Order a Coffee": {
            "turns": [
                ("user", "Hola, buenos días. Quiero un café con leche, por favor."),
                ("model", ("¡Ay, buenos días! Perdona, perdona, la máquina está haciendo un ruido rarísimo… ¿Café con leche, dices? ¿Grande o normal? ¿Para tomar aquí o para llevar?",
                           "She's asking 'for here or to go?' — 'para tomar aquí' or 'para llevar'. Try: 'Para llevar, por favor'.")),
                ("user", "Normal, para llevar. Y… también quiero un cruasán de chocolate."),
                ("model", ("Uy, uy, el de chocolate… ¡se acaban de terminar! Lo siento muchísimo. Me quedan de mantequilla, o una napolitana de crema. ¿Qué prefieres?",
                           "Tip: 'Quisiera' sounds more polite than 'quiero' when ordering. 'Quisiera un cruasán.'")),
                ("user", "Vale, no pasa nada. Quisiera una napolitana de crema. ¿Cuánto es?"),
                ("model", ("¡Gracias por tu paciencia! Son tres euros con ochenta. ¿Pagas con tarjeta? Acércala aquí… ¡eso es!",
                           "You used 'quisiera' — perfect! 'Tres euros con ochenta' is €3.80. How would you say 'Keep the change'?")),
                ("user", "Quédese con el cambio. ¡Gracias, que tenga un buen día!"),
                ("model", ("¡Ay, qué amable! ¡Igualmente! Tu café para llevar y tu napolitana. ¡Hasta mañana!", "")),
            ],
            "feedback": [
                "You kept calm and adapted when the chocolate croissant was sold out — great flexibility.",
                "'Quisiera' is a polite upgrade from 'quiero'; you picked it up quickly.",
                "Watch the stress in 'napolitana' — it falls on the 'ta': na-po-li-TA-na.",
            ],
            "takeaways": [
                "'Para llevar' = to go; 'para tomar aquí' = for here.",
                "Order politely with 'Quisiera…' or '¿Me pone…?' (very common in Spain).",
                "'Quédese con el cambio' = keep the change (formal 'usted').",
            ],
        },
        "Buy a bus ticket": {
            "turns": [
                ("user", "Perdone, ¿este autobús va al centro?"),
                ("model", ("¿Al centro? ¡Pues claro que va al centro, lo pone ahí delante, en grande! Venga, venga, que llevo prisa. ¿Qué billete quiere?",
                           "He's grumpy, stay polite! 'Lo pone ahí' = 'it says so right there'. Ask for a single ticket: 'un billete sencillo'.")),
                ("user", "Un billete sencillo, por favor. ¿Cuánto cuesta?"),
                ("model", ("Un euro cincuenta. Y nada de billetes de cincuenta, ¿eh? Que no tengo cambio.",
                           "Good! 'Cambio' here means 'change' — small money. He doesn't want a €50 note.")),
                ("user", "No, no, tengo monedas. Aquí tiene. ¿Me puede avisar cuando lleguemos a la Plaza Mayor?"),
                ("model", ("Mmm… vale, le aviso. Son cuatro paradas. Siéntese y no se ponga en la puerta, que molesta.",
                           "Excellent — '¿Me puede avisar cuando lleguemos…?' uses the subjunctive correctly. Very advanced!")),
                ("user", "Muchas gracias. Muy amable."),
                ("model", ("Ya, ya… Plaza Mayor, ¡su parada! Hala, que tenga buen día. ¡Bien hecho, eh!", "")),
            ],
            "feedback": [
                "You stayed polite with the grumpy driver — 'Perdone' and 'Aquí tiene' were spot on.",
                "Impressive subjunctive: 'cuando lleguemos' is exactly right.",
                "Try to answer prices faster — practise numbers like 'un euro cincuenta' out loud.",
            ],
            "takeaways": [
                "'Billete sencillo' = single ticket; 'de ida y vuelta' = return.",
                "'Avisar' = to let someone know. '¿Me avisa en la parada?' is very handy.",
                "After 'cuando' talking about the future, use the subjunctive: 'cuando lleguemos'.",
            ],
        },
        "Order dinner with Jack": {
            "turns": [
                ("user", "Oye Jack, tengo hambre. ¿Pedimos algo para cenar?"),
                ("model", ("Buf, sí, me muero de hambre… pero no sé. ¿Pizza? No, pizza comimos el martes. ¿Sushi? Bueno, no sé, es un poco caro…",
                           "'Me muero de hambre' = 'I'm starving' (literally 'I'm dying of hunger'). Very common!")),
                ("user", "¿Qué te parece comida mexicana? Hay un sitio nuevo muy cerca."),
                ("model", ("Mmm, mexicana… ¡vale! Bueno, espera… ¿tienen opciones vegetarianas? Estoy intentando comer menos carne este mes.",
                           "Great suggestion with '¿Qué te parece…?' — 'What do you think about…?'. Ask him what he wants exactly.")),
                ("user", "Sí, tienen burritos vegetarianos y nachos. ¿Qué quieres tú exactamente?"),
                ("model", ("Vale, vale… un burrito de frijoles con guacamole, sin cebolla, ¿eh? Y unos nachos para compartir. ¡Ah, y una horchata!",
                           "'Sin cebolla' = without onion. Quick check: how would you say 'I'll order it now'?")),
                ("user", "Perfecto. Lo pido ahora. Llega en treinta minutos más o menos."),
                ("model", ("¡Eres el mejor compañero de piso del mundo! ¡Gracias, tío! Ya era hora de decidir algo.", "")),
            ],
            "feedback": [
                "Great job steering an indecisive friend with '¿Qué te parece…?'.",
                "You confirmed the order clearly — 'Lo pido ahora' is natural and concise.",
                "Try using more casual fillers like 'venga' or 'pues' to sound more native with friends.",
            ],
            "takeaways": [
                "'Me muero de hambre' = I'm starving.",
                "'¿Qué te parece + noun/infinitive?' to make suggestions.",
                "'Compañero de piso' = flatmate; 'tío/tía' is casual Spain slang for 'mate'.",
            ],
        },
        "Return a Shirt": {
            "turns": [
                ("user", "Hola, buenas. Compré esta camisa la semana pasada, pero la talla es incorrecta."),
                ("model", ("¡Hola, buenas tardes! ¡Ay, qué pena! Pero no te preocupes, eso tiene arreglo. ¿Tienes el tique de compra? ¿Qué talla es?",
                           "'Eso tiene arreglo' = 'that can be fixed'. 'Tique' is the receipt.")),
                ("user", "Sí, aquí está el tique. Es una talla M, pero me queda pequeña."),
                ("model", ("¡Perfecto! ¿Quieres cambiarla por una L, o prefieres que te devolvamos el dinero?",
                           "Nice — 'me queda pequeña' is exactly how natives say 'it's too small on me'. Now ask for the refund!")),
                ("user", "Prefiero el reembolso, por favor. No me gusta mucho el color tampoco."),
                ("model", ("¡Claro que sí! Te devuelvo veintinueve noventa y cinco a la misma tarjeta. Tarda dos o tres días en aparecer, ¿vale?",
                           "'Devolver el dinero' and 'reembolso' both mean refund. How would you ask 'Can I have a bag?'")),
                ("user", "Vale, perfecto. Muchas gracias por su ayuda."),
                ("model", ("¡A ti! ¡Que tengas un día fantástico y vuelve pronto! Lo has hecho genial.", "")),
            ],
            "feedback": [
                "'Me queda pequeña' is a perfect native expression for clothes that don't fit.",
                "You explained the problem and the solution you wanted clearly.",
                "You mixed 'usted' (su ayuda) and 'tú' — in shops in Spain, 'tú' is usually fine.",
            ],
            "takeaways": [
                "'Me queda grande/pequeño' = it's too big/small on me.",
                "'Tique' (or 'ticket') de compra = receipt.",
                "'Reembolso' / 'devolver el dinero' = refund.",
            ],
        },
        "Ask for directions": {
            "turns": [
                ("user", "Disculpe, señora. Estoy perdido. ¿Sabe dónde está la estación de metro?"),
                ("model", ("Ah, ¿la estación? Uf, estás bastante lejos, cariño. A ver… sigue todo recto por esta calle hasta el semáforo, y luego gira a la izquierda.",
                           "'Todo recto' = straight ahead; 'gira a la izquierda' = turn left.")),
                ("user", "¿Todo recto hasta el semáforo y después a la izquierda? ¿Está lejos a pie?"),
                ("model", ("Eso es. Son unos diez minutos andando. Pasas una farmacia y una iglesia muy grande, y la estación está justo enfrente de la iglesia.",
                           "Great repeat-back to confirm directions — natives do this too! 'Justo enfrente de' = right opposite.")),
                ("user", "Perfecto, la farmacia, la iglesia, y la estación está enfrente. Muchísimas gracias."),
                ("model", ("De nada, hijo. Y cuidado con el bolso en el metro, ¿eh? ¡Buen viaje!", "")),
            ],
            "feedback": [
                "Repeating directions back to confirm is a smart, natural strategy.",
                "'¿Está lejos a pie?' — great practical follow-up question.",
                "Work on rolling the 'r' in 'recto' and 'derecha' — it will make you easier to understand.",
            ],
            "takeaways": [
                "'Todo recto' = straight on; 'a la derecha / izquierda' = to the right / left.",
                "'Justo enfrente de' = right opposite; 'al lado de' = next to.",
                "'Andando' / 'a pie' = on foot.",
            ],
        },
        "Market Bargaining": {
            "turns": [
                ("user", "Buenas. ¿Cuánto cuesta este plato de cerámica azul?"),
                ("model", ("¡Mira qué bonito, eh! ¡Hecho a mano, auténtico! Para ti, cuarenta euros. ¡Cuarenta! ¡Una ganga!",
                           "'Una ganga' = a bargain. Forty is the opening price — counter-offer!")),
                ("user", "¿Cuarenta? Es muy caro. Le doy veinte."),
                ("model", ("¡¿Veinte?! ¡Me quieres arruinar! Mira, porque eres simpático, treinta y cinco.",
                           "Good counter. Try: '¿Me lo deja en veinticinco?' — 'Will you let me have it for 25?'")),
                ("user", "Mmm… ¿me lo deja en veinticinco? Si no, voy al otro puesto."),
                ("model", ("¡Ay, qué duro negocias! Venga, treinta, y te regalo un imán de la Alhambra. ¡Última oferta!",
                           "Walking away is a classic tactic — well played!")),
                ("user", "Vale, trato hecho. Treinta con el imán."),
                ("model", ("¡Trato hecho! Te lo envuelvo bien en papel para que no se rompa. ¡Eres un negociante de primera!", "")),
            ],
            "feedback": [
                "Excellent bargaining — you cut the price by 25% and got a gift.",
                "'¿Me lo deja en…?' is exactly the phrase local shoppers use.",
                "Numbers between 20 and 40 were confident; practise 'cuarenta' vs 'catorce'.",
            ],
            "takeaways": [
                "'Una ganga' = a bargain; '¡Qué caro!' = how expensive!",
                "'¿Me lo deja en + price?' to haggle.",
                "'Trato hecho' = it's a deal.",
            ],
        },
        "Negotiate rent": {
            "turns": [
                ("user", "Buenas tardes, señor Ortega. Quería hablar con usted sobre la subida del alquiler."),
                ("model", ("Buenas tardes. Sí, ya le envié la carta. A partir de enero el alquiler pasa de ochocientos cincuenta a novecientos cincuenta euros. Los precios en el barrio han subido.",
                           "'A partir de' = starting from. He's raising rent by €100 — argue your case politely.")),
                ("user", "Entiendo, pero cien euros es mucho. Llevo tres años aquí y siempre pago a tiempo."),
                ("model", ("Eso es verdad, es usted un buen inquilino. Pero yo también tengo gastos: la comunidad, el IBI, la caldera nueva…",
                           "Strong argument! 'Llevo tres años aquí' = I've been here three years. 'Inquilino' = tenant.")),
                ("user", "Lo comprendo. ¿Podríamos dejarlo en novecientos si firmo un contrato de dos años?"),
                ("model", ("Mmm… un contrato de dos años… Eso me da estabilidad. Novecientos, pero la limpieza de la terraza corre de su cuenta.",
                           "Excellent use of the conditional 'podríamos' — very diplomatic. 'Correr de su cuenta' = to be your responsibility.")),
                ("user", "De acuerdo. Novecientos euros y un contrato de dos años. Me parece justo."),
                ("model", ("Muy bien. Le preparo el contrato esta semana. Ha sabido negociar, se lo reconozco.", "")),
            ],
            "feedback": [
                "Very diplomatic — '¿Podríamos dejarlo en…?' softened your counter-offer.",
                "You backed your request with good reasons: tenure and reliable payment.",
                "You hesitated on 'novecientos' — practise hundreds (quinientos, setecientos, novecientos).",
            ],
            "takeaways": [
                "'Inquilino' = tenant; 'casero' = landlord; 'alquiler' = rent.",
                "'Llevar + time + aquí' = to have been here for (time).",
                "Use the conditional ('podríamos', 'sería posible') to negotiate politely.",
            ],
        },
        "Job Interview": {
            "turns": [
                ("user", "Buenos días. Encantado de conocerla. Gracias por la oportunidad."),
                ("model", ("Buenos días, encantada. Siéntese, por favor. Bueno, cuénteme un poco sobre usted. ¿Cuáles diría que son sus puntos fuertes?",
                           "'Puntos fuertes' = strengths. Use 'Soy una persona…' to describe yourself.")),
                ("user", "Soy una persona muy organizada y me gusta trabajar en equipo. En mi último trabajo coordiné un proyecto con clientes de cinco países."),
                ("model", ("Muy interesante. ¿Y algún punto débil? Sea sincero.",
                           "Great detail with a concrete example. 'Punto débil' = weakness.")),
                ("user", "A veces soy demasiado perfeccionista y tardo en delegar. Pero estoy aprendiendo a confiar más en mi equipo."),
                ("model", ("Me gusta esa respuesta, es honesta. Y por último, ¿por qué quiere trabajar en nuestra empresa?",
                           "Perfect 'weakness turned into growth' answer. How would you say 'I admire your company's values'?")),
                ("user", "Admiro los valores de la empresa, sobre todo el compromiso con la sostenibilidad, y creo que puedo aportar mucho."),
                ("model", ("Excelente. Le llamaremos la próxima semana con una respuesta. Ha sido un placer.", "")),
            ],
            "feedback": [
                "You gave a concrete example for your strength — that's very persuasive.",
                "Your weakness answer was honest and showed growth.",
                "Use 'usted' consistently in interviews — you did that well throughout.",
            ],
            "takeaways": [
                "'Puntos fuertes / débiles' = strengths / weaknesses.",
                "'Aportar' = to contribute; 'Creo que puedo aportar…' is a great interview phrase.",
                "'Trabajar en equipo' = teamwork.",
            ],
        },
    },
}

# Generic fallback lines for languages without a full script:
# (greeting, ask, model_reply, thanks, goodbye)
GENERIC = {
    "English": ("Hi there! Excuse me, could you help me with something?", "Of course! What do you need?",
                "Great, that's exactly what I was looking for. Thank you so much.", "You're very welcome. Have a lovely day!"),
    "French": ("Bonjour ! Excusez-moi, vous pouvez m'aider ?", "Bien sûr ! Qu'est-ce que je peux faire pour vous ?",
               "Parfait, c'est exactement ce qu'il me fallait. Merci beaucoup.", "Je vous en prie. Bonne journée !"),
    "German": ("Hallo! Entschuldigung, können Sie mir helfen?", "Natürlich! Was brauchen Sie denn?",
               "Super, genau das habe ich gesucht. Vielen Dank.", "Gern geschehen. Einen schönen Tag noch!"),
    "Italian": ("Buongiorno! Scusi, mi può aiutare?", "Certo! Di che cosa ha bisogno?",
                "Perfetto, è proprio quello che cercavo. Grazie mille.", "Prego, si figuri. Buona giornata!"),
    "Portuguese": ("Olá! Com licença, pode me ajudar?", "Claro! Do que você precisa?",
                   "Perfeito, era exatamente isso que eu procurava. Muito obrigado.", "De nada! Tenha um ótimo dia!"),
    "Japanese": ("すみません、ちょっと手伝っていただけますか。", "はい、もちろんです！どうされましたか？",
                 "ちょうど探していたものです。本当にありがとうございます。", "どういたしまして。良い一日を！"),
    "Korean": ("안녕하세요! 실례지만 좀 도와주실 수 있어요?", "네, 물론이죠! 뭐가 필요하세요?",
               "딱 제가 찾던 거예요. 정말 감사합니다.", "천만에요. 좋은 하루 보내세요!"),
    "Dutch": ("Hallo! Sorry, kunt u me even helpen?", "Natuurlijk! Waarmee kan ik u helpen?",
              "Perfect, dat is precies wat ik zocht. Hartelijk bedankt.", "Graag gedaan. Nog een fijne dag!"),
    "Polish": ("Dzień dobry! Przepraszam, czy może mi pan pomóc?", "Oczywiście! W czym mogę pomóc?",
               "Świetnie, właśnie tego szukałem. Bardzo dziękuję.", "Nie ma za co. Miłego dnia!"),
    "Russian": ("Здравствуйте! Извините, вы не могли бы мне помочь?", "Конечно! Чем могу помочь?",
                "Отлично, это именно то, что я искал. Большое спасибо.", "Пожалуйста. Хорошего дня!"),
    "Hindi": ("नमस्ते! माफ़ कीजिए, क्या आप मेरी मदद कर सकते हैं?", "हाँ, ज़रूर! आपको क्या चाहिए?",
              "बढ़िया, मुझे बिल्कुल यही चाहिए था। बहुत-बहुत धन्यवाद।", "कोई बात नहीं। आपका दिन शुभ हो!"),
    "Arabic": ("مرحبا! لو سمحت، ممكن تساعدني؟", "أكيد! شو بتحتاج؟",
               "ممتاز، هذا بالضبط اللي كنت أدور عليه. شكراً جزيلاً.", "العفو. يومك سعيد!"),
    "Indonesian": ("Halo! Permisi, bisa bantu saya?", "Tentu saja! Ada yang bisa saya bantu?",
                   "Bagus, itu persis yang saya cari. Terima kasih banyak.", "Sama-sama. Semoga harimu menyenangkan!"),
    "Turkish": ("Merhaba! Affedersiniz, bana yardım edebilir misiniz?", "Tabii ki! Neye ihtiyacınız var?",
                "Harika, tam da aradığım buydu. Çok teşekkür ederim.", "Rica ederim. İyi günler!"),
    "Vietnamese": ("Xin chào! Xin lỗi, bạn có thể giúp tôi được không?", "Dạ, tất nhiên rồi! Bạn cần gì ạ?",
                   "Tuyệt quá, đúng là thứ tôi đang tìm. Cảm ơn bạn rất nhiều.", "Không có gì. Chúc bạn một ngày tốt lành!"),
    "Thai": ("สวัสดีครับ ขอโทษนะครับ ช่วยผมหน่อยได้ไหมครับ", "ได้เลยค่ะ ต้องการอะไรคะ",
             "เยี่ยมเลยครับ นี่แหละที่ผมกำลังหา ขอบคุณมากครับ", "ยินดีค่ะ ขอให้เป็นวันที่ดีนะคะ"),
    "Ukrainian": ("Добрий день! Вибачте, ви не могли б мені допомогти?", "Звісно! Чим можу допомогти?",
                  "Чудово, це саме те, що я шукав. Щиро дякую.", "Будь ласка. Гарного дня!"),
    "Romanian": ("Bună ziua! Scuzați-mă, mă puteți ajuta?", "Sigur! De ce aveți nevoie?",
                 "Perfect, exact asta căutam. Mulțumesc mult.", "Cu plăcere. O zi bună!"),
    "Bengali": ("নমস্কার! মাফ করবেন, আমাকে একটু সাহায্য করতে পারবেন?", "অবশ্যই! আপনার কী দরকার?",
                "দারুণ, ঠিক এটাই খুঁজছিলাম। অনেক ধন্যবাদ।", "কোনো ব্যাপার না। আপনার দিনটি শুভ হোক!"),
    "Marathi": ("नमस्कार! माफ करा, तुम्ही मला थोडी मदत कराल का?", "हो, नक्कीच! तुम्हाला काय हवं आहे?",
                "छान, मला नेमकं हेच हवं होतं. खूप खूप धन्यवाद.", "काही हरकत नाही. तुमचा दिवस छान जावो!"),
    "Tamil": ("வணக்கம்! மன்னிக்கவும், எனக்கு கொஞ்சம் உதவ முடியுமா?", "நிச்சயமாக! உங்களுக்கு என்ன வேண்டும்?",
              "அருமை, நான் தேடியது இதுதான். ரொம்ப நன்றி.", "பரவாயில்லை. இனிய நாளாக அமையட்டும்!"),
    "Telugu": ("నమస్కారం! క్షమించండి, నాకు కొంచెం సహాయం చేయగలరా?", "తప్పకుండా! మీకు ఏమి కావాలి?",
               "చాలా బాగుంది, నేను వెతుకుతున్నది ఇదే. చాలా ధన్యవాదాలు.", "పర్వాలేదు. మీ రోజు శుభంగా గడవాలి!"),
    "Science Jargon": ("Greetings. I hypothesise you possess the requisite expertise to assist me.",
                       "Affirmative. Kindly specify the parameters of your request.",
                       "Excellent, that output is statistically consistent with my expected result. Much gratitude.",
                       "Acknowledged. May your day exhibit a positive trend with minimal variance."),
}

GENERIC_FEEDBACK = [
    "You opened politely and got straight to the point — a great start.",
    "Good confidence; you kept going even when you weren't sure of a word.",
    "Next time, try adding one follow-up question to keep the conversation flowing.",
]
GENERIC_TAKEAWAYS = [
    "Polite openers like 'excuse me, could you help me?' work in almost every scenario.",
    "Learn the standard reply to 'thank you' in this language — you'll hear it constantly.",
    "Practise ending conversations with a wish like 'have a nice day'.",
]


def _all_scripts():
    try:
        from dialogues_extra import EXTRA
    except ImportError:
        EXTRA = {}
    merged = {k: dict(v) for k, v in SCRIPTS.items()}
    for lang, missions in EXTRA.items():
        merged.setdefault(lang, {}).update(missions)
    return merged


def get_dialogue(mission: str, language: str, mode: str, from_language: str = "English"):
    teacher = mode == "teacher"
    script = _all_scripts().get(language, {}).get(mission)
    if script is None:
        g = GENERIC.get(language, GENERIC["French"])
        script = {
            "turns": [("user", g[0]), ("model", g[1]), ("user", g[2]), ("model", g[3])],
            "feedback": GENERIC_FEEDBACK, "takeaways": GENERIC_TAKEAWAYS,
        }
    turns = []
    for who, text in script["turns"]:
        if isinstance(text, tuple):
            spoken, note = text
            text = f"{spoken} {note}".strip() if teacher and note else spoken
        turns.append((who, text))
    if teacher:
        return {"turns": turns, "score": 0, "feedback": script["takeaways"]}
    score = script.get("score") or random.choice([1, 2, 2, 2, 3, 3])
    return {"turns": turns, "score": score, "feedback": script["feedback"]}
