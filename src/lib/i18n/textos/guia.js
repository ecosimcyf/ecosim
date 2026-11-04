// Textos de la guía de uso pública (/guia), en los tres idiomas.
// Los nombres entre «» son los de los botones reales de la app: si cambian
// en panel.js o estudiante.js, hay que cambiarlos también aquí.
// En los textos: **negrita**.

export const GUIA = {
  es: {
    meta: {
      titulo: 'Guía de uso — EcoSim',
      descripcion: 'Paso a paso para profesores y estudiantes: cargar casos, compartir el enlace y practicar la ecografía en EcoSim.',
    },
    eyebrow: 'Guía de uso',
    titulo: 'Cómo se usa EcoSim, paso a paso',
    intro: 'Una parte para quien prepara los casos (el profesor o la clínica) y otra para quien practica (el estudiante). No hace falta leerla entera: ve directo a la tuya.',
    irProfesor: 'Soy profesor',
    irEstudiante: 'Soy estudiante',
    indice: 'Pasos',
    profesor: {
      eyebrow: 'Para el profesor',
      titulo: 'Preparar los casos',
      intro: 'Todo se hace desde tu panel, en el computador o la tablet. Los pasos 3 a 6 los haces una vez por caso; el paso 2, el de los puntos, una sola vez.',
      pasos: [
        {
          titulo: 'Entra a tu panel',
          texto: [
            'Entra en **Iniciar sesión** (arriba a la derecha de esta página) con el correo y la contraseña temporal que te dio tu asesor.',
            'Lo primero: cámbiala por una tuya en **Cambiar contraseña**. Si algún día la olvidas, tu asesor te genera otra.',
          ],
        },
        {
          titulo: 'Ubica los puntos del maniquí',
          texto: [
            'En la tarjeta **Maniquí — puntos del cuerpo** eliges la especie (perro o gato) y la vista (abajo, izquierda o derecha).',
            'Pulsa **+ Añadir punto**, arrástralo a su lugar sobre el cuerpo y tócalo para ponerle nombre (por ejemplo, «Riñón izquierdo»). El nombre solo lo ves tú: el estudiante nunca lo ve.',
          ],
          tip: 'Los puntos se definen una sola vez: todos tus casos de esa especie los comparten. En cada caso solo cambia qué video tiene cada punto.',
        },
        {
          titulo: 'Crea un caso',
          texto: [
            'En **Casos**, escribe un nombre (por ejemplo, «Piómetra — hembra de 8 años»), elige la especie y pulsa **Crear caso**.',
            'Escribe la **descripción**: el motivo de consulta y los síntomas. El estudiante la lee antes de entrar, como si recibiera al paciente.',
          ],
          tip: 'El nombre del caso sí lo ve el estudiante en el menú: no pongas el diagnóstico si quieres que lo descubra.',
        },
        {
          titulo: 'Asigna los videos',
          texto: [
            'Pulsa **Asignar videos** en el caso, toca un punto del maniquí y elige el video con **Elegir video…**. Repite con cada punto.',
            'Cada video puede durar hasta **30 segundos**. Si tu ecógrafo graba en un formato que el navegador no reproduce, el panel lo convierte solo antes de subirlo (puede tardar 1 a 3 minutos; no cierres la ventana).',
          ],
          tip: 'Un punto sin video se le muestra al estudiante en amarillo: así sabe que ahí no hay imagen en este caso.',
        },
        {
          titulo: 'Agrega exámenes (opcional)',
          texto: [
            'Con **Exámenes** sumas al caso lo que el estudiante consultaría en la vida real:',
            '**Laboratorio**: sube la foto o el PDF del reporte, o llena las tablas con las plantillas (hemograma, química, uroanálisis, gases). **Radiografías**: sube las imágenes. **Signos vitales**: el estudiante los ve en un monitor.',
          ],
        },
        {
          titulo: 'Activa el caso',
          texto: [
            'Enciende el interruptor del caso para que aparezca en el menú de tus estudiantes (**● Activo**). Puedes tener varios activos a la vez y apagarlos cuando quieras: el cambio les llega en unos segundos.',
          ],
          tip: 'Un caso sin videos ni exámenes no aparece en el menú aunque esté activo.',
        },
        {
          titulo: 'Comparte el enlace (y, si quieres, un código)',
          texto: [
            'En **Casos activos** está el enlace de tu cuenta, con su botón **Copiar**. Pásalo a tus estudiantes por el chat del grupo o el aula virtual.',
            'Si quieres que solo entren ellos, pon un **código de acceso** en esa misma tarjeta y díselo en clase. Lo escriben una vez por dispositivo. Si lo cambias, todos tendrán que escribir el nuevo (útil al terminar el semestre).',
          ],
        },
      ],
      cupo: 'En la misma tarjeta ves cuántos casos y cuánto almacenamiento llevas usados de tu plan. Si te acercas al límite, habla con tu asesor.',
    },
    estudiante: {
      eyebrow: 'Para el estudiante',
      titulo: 'Practicar la ecografía',
      intro: 'Funciona en el celular, la tablet o el computador, sin instalar nada ni crear usuario.',
      pasos: [
        {
          titulo: 'Abre el enlace de tu profesor',
          texto: [
            'Si te pide un **código de acceso**, escribe el que te dio tu profesor. Solo hace falta una vez en ese dispositivo.',
          ],
          tip: 'En el celular puedes usar «Añadir a pantalla de inicio» del navegador: se abre como una app, sin barras.',
          captura: 'codigo',
        },
        {
          titulo: 'Elige un caso',
          texto: [
            'En el menú aparecen los casos que tu profesor dejó activos. Al tocar uno lees su **descripción** (motivo de consulta, síntomas) y pulsas **Continuar**.',
            'Los íconos de cada tarjeta te dicen si el caso trae laboratorio, radiografías o signos vitales.',
          ],
          captura: 'menu',
        },
        {
          titulo: 'Explora el paciente',
          texto: [
            'En el celular, **gira la pantalla** a horizontal. A la derecha está el maniquí: **mantén presionado un punto** y en la pantalla aparece la ecografía de esa zona, como si apoyaras el transductor. Al soltar, la sonda vuelve al reposo.',
            'Cambia de vista con **Abajo**, **Izq** y **Der** para llegar a todos los puntos.',
          ],
          tip: 'La primera vez que entras a un caso puede salir «Preparando las ecografías…»: se descargan una sola vez y luego responden al instante.',
          captura: 'caso',
        },
        {
          titulo: 'Congela la imagen para estudiarla',
          texto: [
            'Pulsa **❚❚ Congelar** (o la tecla **Espacio** en el computador). Mientras está congelada puedes soltar el punto y mirar la imagen con calma. **▶ Seguir** la vuelve a mover.',
          ],
        },
        {
          titulo: 'Revisa los exámenes',
          texto: [
            'Si el caso los trae, arriba a la derecha de la imagen aparecen los botones de **Laboratorio**, **Radiografías** y **Signos vitales**. En las radiografías puedes acercar, cambiar el brillo y el contraste, o invertir la imagen.',
          ],
        },
        {
          titulo: 'Cambia de caso',
          texto: [
            'Con **← Casos** vuelves al menú. En el computador, **F11** pone la pantalla completa y **F1** muestra todos los atajos.',
          ],
        },
      ],
    },
    problemas: {
      eyebrow: 'Si algo no funciona',
      titulo: 'Problemas frecuentes',
      lista: [
        { p: 'El estudiante no ve un caso en el menú', r: 'Revisa en el panel que el caso esté **activo** y que tenga al menos un video o un examen. El menú se actualiza solo en unos 15 segundos.' },
        { p: 'Dice «Ese código no es correcto»', r: 'No importan las mayúsculas ni los espacios, pero sí cada letra y número. Si el profesor cambió el código, hay que escribir el nuevo.' },
        { p: 'Dice «Demasiados intentos»', r: 'Se probaron muchos códigos equivocados desde la misma red. Esperen unos minutos y escriban el código correcto.' },
        { p: 'Un video tarda en aparecer', r: 'En los casos muy grandes cada video se descarga la primera vez que se toca su punto («Cargando video…»). La segunda vez ya sale al instante. Si pasa siempre, revisa la conexión a internet.' },
        { p: 'Dice «Este enlace no está disponible»', r: 'El enlace está mal escrito o la cuenta está desactivada. El profesor puede escribirle a su asesor.' },
      ],
    },
    ayuda: {
      titulo: '¿Te quedó alguna duda?',
      texto: 'Escríbenos y te ayudamos a preparar tu primer caso.',
      whatsapp: 'Escribir por WhatsApp',
      mensaje: 'Hola, tengo una pregunta sobre cómo usar EcoSim.',
    },
    capturas: {
      codigo: 'Pantalla para escribir el código de acceso de la cuenta',
      menu: 'Menú de casos activos que ve el estudiante',
      caso: 'Vista del estudiante: la ecografía a la izquierda y el maniquí con sus puntos a la derecha',
    },
    paso: 'Paso',
    consejo: 'Consejo',
    volverArriba: 'Volver arriba',
  },

  pt: {
    meta: {
      titulo: 'Guia de uso — EcoSim',
      descripcion: 'Passo a passo para professores e alunos: cadastrar casos, compartilhar o link e praticar a ultrassonografia no EcoSim.',
    },
    eyebrow: 'Guia de uso',
    titulo: 'Como usar o EcoSim, passo a passo',
    intro: 'Uma parte para quem prepara os casos (o professor ou a clínica) e outra para quem pratica (o aluno). Não precisa ler tudo: vá direto à sua.',
    irProfesor: 'Sou professor',
    irEstudiante: 'Sou aluno',
    indice: 'Passos',
    profesor: {
      eyebrow: 'Para o professor',
      titulo: 'Preparar os casos',
      intro: 'Tudo é feito no seu painel, no computador ou no tablet. Os passos 3 a 6 você faz uma vez por caso; o passo 2, dos pontos, uma única vez.',
      pasos: [
        {
          titulo: 'Entre no seu painel',
          texto: [
            'Clique em **Entrar** (no canto superior direito desta página) com o e-mail e a senha temporária que seu consultor enviou.',
            'Primeiro de tudo: troque-a por uma sua em **Alterar senha**. Se um dia esquecer, seu consultor gera outra.',
          ],
        },
        {
          titulo: 'Posicione os pontos do manequim',
          texto: [
            'No cartão **Manequim — pontos do corpo** você escolhe a espécie (cão ou gato) e a vista (de baixo, esquerda ou direita).',
            'Clique em **+ Adicionar ponto**, arraste-o até o lugar no corpo e toque nele para dar um nome (por exemplo, «Rim esquerdo»). Só você vê o nome: o aluno nunca o vê.',
          ],
          tip: 'Os pontos são definidos uma única vez: todos os seus casos daquela espécie os compartilham. Em cada caso muda apenas qual vídeo cada ponto tem.',
        },
        {
          titulo: 'Crie um caso',
          texto: [
            'Em **Casos**, digite um nome (por exemplo, «Piometra — fêmea de 8 anos»), escolha a espécie e clique em **Criar caso**.',
            'Escreva a **descrição**: a queixa principal e os sintomas. O aluno a lê antes de entrar, como se recebesse o paciente.',
          ],
          tip: 'O aluno vê o nome do caso no menu: não coloque o diagnóstico se quiser que ele o descubra.',
        },
        {
          titulo: 'Atribua os vídeos',
          texto: [
            'Clique em **Atribuir vídeos** no caso, toque em um ponto do manequim e escolha o vídeo. Repita com cada ponto.',
            'Cada vídeo pode durar até **30 segundos**. Se o seu ultrassom grava em um formato que o navegador não reproduz, o painel o converte sozinho antes de enviar (pode levar de 1 a 3 minutos; não feche a janela).',
          ],
          tip: 'Um ponto sem vídeo aparece em amarelo para o aluno: assim ele sabe que ali não há imagem neste caso.',
        },
        {
          titulo: 'Adicione exames (opcional)',
          texto: [
            'Com **Exames** você soma ao caso o que o aluno consultaria na vida real:',
            '**Laboratório**: envie a foto ou o PDF do laudo, ou preencha as tabelas com os modelos (hemograma, bioquímica, urinálise, gasometria). **Radiografias**: envie as imagens. **Sinais vitais**: o aluno os vê em um monitor.',
          ],
        },
        {
          titulo: 'Ative o caso',
          texto: [
            'Ligue o interruptor do caso para que ele apareça no menu dos seus alunos (**● Ativo**). Você pode ter vários ativos ao mesmo tempo e desligá-los quando quiser: a mudança chega a eles em poucos segundos.',
          ],
          tip: 'Um caso sem vídeos nem exames não aparece no menu, mesmo ativo.',
        },
        {
          titulo: 'Compartilhe o link (e, se quiser, um código)',
          texto: [
            'Em **Casos ativos** está o link da sua conta, com o botão **Copiar**. Envie-o aos seus alunos pelo grupo da turma ou pelo ambiente virtual.',
            'Se quiser que só eles entrem, defina um **código de acesso** nesse mesmo cartão e passe-o em aula. Eles o digitam uma vez por dispositivo. Se você trocá-lo, todos terão de digitar o novo (útil ao fim do semestre).',
          ],
        },
      ],
      cupo: 'No mesmo cartão você vê quantos casos e quanto armazenamento já usou do seu plano. Se estiver perto do limite, fale com seu consultor.',
    },
    estudiante: {
      eyebrow: 'Para o aluno',
      titulo: 'Praticar a ultrassonografia',
      intro: 'Funciona no celular, no tablet ou no computador, sem instalar nada nem criar usuário.',
      pasos: [
        {
          titulo: 'Abra o link do seu professor',
          texto: [
            'Se pedir um **código de acesso**, digite o que seu professor passou. Só é preciso uma vez naquele dispositivo.',
          ],
          tip: 'No celular você pode usar «Adicionar à tela inicial» do navegador: abre como um app, sem barras.',
          captura: 'codigo',
        },
        {
          titulo: 'Escolha um caso',
          texto: [
            'No menu aparecem os casos que seu professor deixou ativos. Ao tocar em um, você lê a **descrição** (queixa principal, sintomas) e clica em **Continuar**.',
            'Os ícones de cada cartão mostram se o caso traz laboratório, radiografias ou sinais vitais.',
          ],
          captura: 'menu',
        },
        {
          titulo: 'Examine o paciente',
          texto: [
            'No celular, **gire a tela** para a horizontal. À direita está o manequim: **mantenha um ponto pressionado** e a ultrassonografia daquela região aparece na tela, como se você apoiasse o transdutor. Ao soltar, a sonda volta ao repouso.',
            'Mude de vista com **Ventral**, **Esq.** e **Dir.** para chegar a todos os pontos.',
          ],
          tip: 'Na primeira vez que você entra em um caso pode aparecer «Preparando as ultrassonografias…»: elas são baixadas uma única vez e depois respondem na hora.',
          captura: 'caso',
        },
        {
          titulo: 'Congele a imagem para estudá-la',
          texto: [
            'Clique em **❚❚ Congelar** (ou na tecla **Espaço** no computador). Enquanto estiver congelada, você pode soltar o ponto e olhar a imagem com calma. **▶ Continuar** volta a movimentá-la.',
          ],
        },
        {
          titulo: 'Consulte os exames',
          texto: [
            'Se o caso os tiver, no canto superior direito da imagem aparecem os botões de **Laboratório**, **Radiografias** e **Sinais vitais**. Nas radiografias você pode aproximar, mudar o brilho e o contraste ou inverter a imagem.',
          ],
        },
        {
          titulo: 'Troque de caso',
          texto: [
            'Com **← Casos** você volta ao menu. No computador, **F11** coloca em tela cheia e **F1** mostra todos os atalhos.',
          ],
        },
      ],
    },
    problemas: {
      eyebrow: 'Se algo não funcionar',
      titulo: 'Problemas frequentes',
      lista: [
        { p: 'O aluno não vê um caso no menu', r: 'Confira no painel se o caso está **ativo** e se tem pelo menos um vídeo ou um exame. O menu se atualiza sozinho em uns 15 segundos.' },
        { p: 'Aparece «Esse código não está correto»', r: 'Maiúsculas e espaços não importam, mas cada letra e número sim. Se o professor trocou o código, é preciso digitar o novo.' },
        { p: 'Aparece «Tentativas demais»', r: 'Foram testados muitos códigos errados a partir da mesma rede. Aguardem alguns minutos e digitem o código correto.' },
        { p: 'Um vídeo demora para aparecer', r: 'Nos casos muito grandes, cada vídeo é baixado na primeira vez que seu ponto é tocado («Carregando vídeo…»). Na segunda vez já aparece na hora. Se acontecer sempre, confira a conexão com a internet.' },
        { p: 'Aparece «Este link não está disponível»', r: 'O link está escrito errado ou a conta está desativada. O professor pode falar com seu consultor.' },
      ],
    },
    ayuda: {
      titulo: 'Ficou alguma dúvida?',
      texto: 'Fale com a gente e ajudamos você a preparar seu primeiro caso.',
      whatsapp: 'Falar pelo WhatsApp',
      mensaje: 'Olá, tenho uma dúvida sobre como usar o EcoSim.',
    },
    capturas: {
      codigo: 'Tela para digitar o código de acesso da conta',
      menu: 'Menu de casos ativos que o aluno vê',
      caso: 'Vista do aluno: a ultrassonografia à esquerda e o manequim com seus pontos à direita',
    },
    paso: 'Passo',
    consejo: 'Dica',
    volverArriba: 'Voltar ao topo',
  },

  en: {
    meta: {
      titulo: 'User guide — EcoSim',
      descripcion: 'Step by step for teachers and students: set up cases, share the link and practice ultrasound with EcoSim.',
    },
    eyebrow: 'User guide',
    titulo: 'How to use EcoSim, step by step',
    intro: 'One part for whoever prepares the cases (the teacher or the clinic) and one for whoever practices (the student). No need to read it all: jump straight to yours.',
    irProfesor: 'I’m a teacher',
    irEstudiante: 'I’m a student',
    indice: 'Steps',
    profesor: {
      eyebrow: 'For teachers',
      titulo: 'Preparing the cases',
      intro: 'Everything is done from your dashboard, on a computer or tablet. You do steps 3 to 6 once per case, and step 2 (the points) only once.',
      pasos: [
        {
          titulo: 'Log in to your dashboard',
          texto: [
            'Click **Log in** (top right of this page) with the email and temporary password your advisor gave you.',
            'First thing: replace it with your own under **Change password**. If you ever forget it, your advisor will create a new one.',
          ],
        },
        {
          titulo: 'Place the points on the mannequin',
          texto: [
            'On the **Mannequin — body points** card, choose the species (dog or cat) and the view (bottom, left or right).',
            'Click **+ Add point**, drag it into place on the body and tap it to name it (for example, “Left kidney”). Only you see the name: students never do.',
          ],
          tip: 'Points are set up only once: all your cases for that species share them. Each case only changes which video each point has.',
        },
        {
          titulo: 'Create a case',
          texto: [
            'Under **Cases**, type a name (for example, “Pyometra — 8-year-old female”), choose the species and click **Create case**.',
            'Write the **description**: the presenting complaint and symptoms. Students read it before going in, as if they were receiving the patient.',
          ],
          tip: 'Students do see the case name in the menu: leave the diagnosis out if you want them to work it out.',
        },
        {
          titulo: 'Assign the videos',
          texto: [
            'Click **Assign videos** on the case, tap a point on the mannequin and choose the video. Repeat for each point.',
            'Each video can be up to **30 seconds** long. If your ultrasound machine records in a format browsers can’t play, the dashboard converts it automatically before uploading (it can take 1 to 3 minutes; don’t close the window).',
          ],
          tip: 'Students see a point without a video in yellow, so they know there is no image there for this case.',
        },
        {
          titulo: 'Add tests (optional)',
          texto: [
            'With **Tests** you add what students would look up in real life:',
            '**Laboratory**: upload a photo or PDF of the report, or fill in the tables using the templates (CBC, chemistry, urinalysis, blood gases). **X-rays**: upload the images. **Vital signs**: students see them on a monitor.',
          ],
        },
        {
          titulo: 'Turn the case on',
          texto: [
            'Switch the case on so it appears in your students’ menu (**● Active**). Several cases can be on at once, and you can switch them off at any time: students see the change within seconds.',
          ],
          tip: 'A case with no videos or tests does not appear in the menu, even if it is on.',
        },
        {
          titulo: 'Share the link (and, if you like, a code)',
          texto: [
            'Your account’s link is on the **Active cases** card, with a **Copy** button. Send it to your students through the class chat or your virtual classroom.',
            'If you want only them to get in, set an **access code** on that same card and tell them in class. They type it once per device. If you change it, everyone has to type the new one (handy at the end of a term).',
          ],
        },
      ],
      cupo: 'The same card shows how many cases and how much storage of your plan you have used. If you are getting close to the limit, talk to your advisor.',
    },
    estudiante: {
      eyebrow: 'For students',
      titulo: 'Practicing ultrasound',
      intro: 'It works on a phone, tablet or computer, with nothing to install and no account to create.',
      pasos: [
        {
          titulo: 'Open your teacher’s link',
          texto: [
            'If it asks for an **access code**, type the one your teacher gave you. You only need to do this once on that device.',
          ],
          tip: 'On a phone, you can use your browser’s “Add to Home Screen”: it then opens like an app, without the browser bars.',
          captura: 'codigo',
        },
        {
          titulo: 'Choose a case',
          texto: [
            'The menu shows the cases your teacher has turned on. When you tap one, you read its **description** (presenting complaint, symptoms) and press **Continue**.',
            'The icons on each card tell you whether the case includes lab work, X-rays or vital signs.',
          ],
          captura: 'menu',
        },
        {
          titulo: 'Examine the patient',
          texto: [
            'On a phone, **turn the screen** sideways. The mannequin is on the right: **press and hold a point** and the ultrasound of that area appears on screen, as if you were placing the transducer there. When you let go, the probe goes back to rest.',
            'Switch views with **Ventral**, **Left** and **Right** to reach every point.',
          ],
          tip: 'The first time you open a case you may see “Preparing the ultrasound videos…”: they are downloaded only once and then respond instantly.',
          captura: 'caso',
        },
        {
          titulo: 'Freeze the image to study it',
          texto: [
            'Press **❚❚ Freeze** (or the **Space** key on a computer). While it is frozen, you can let go of the point and study the image calmly. **▶ Resume** sets it moving again.',
          ],
        },
        {
          titulo: 'Check the tests',
          texto: [
            'If the case includes them, buttons for **Lab results**, **Radiographs** and **Vital signs** appear at the top right of the image. In the radiograph viewer you can zoom, change brightness and contrast, or invert the image.',
          ],
        },
        {
          titulo: 'Switch cases',
          texto: [
            '**← Cases** takes you back to the menu. On a computer, **F11** goes full screen and **F1** shows all the shortcuts.',
          ],
        },
      ],
    },
    problemas: {
      eyebrow: 'If something isn’t working',
      titulo: 'Common problems',
      lista: [
        { p: 'A student can’t see a case in the menu', r: 'Check in the dashboard that the case is **on** and has at least one video or test. The menu refreshes by itself within about 15 seconds.' },
        { p: 'It says “That code is not correct”', r: 'Capital letters and spaces don’t matter, but every letter and number does. If the teacher changed the code, the new one has to be typed in.' },
        { p: 'It says “Too many attempts”', r: 'Too many wrong codes were tried from the same network. Wait a few minutes and type the correct code.' },
        { p: 'A video takes a while to appear', r: 'In very large cases, each video is downloaded the first time its point is touched (“Loading video…”). The second time it appears instantly. If it happens every time, check the internet connection.' },
        { p: 'It says “This link isn’t available”', r: 'The link is mistyped or the account is turned off. The teacher can contact their advisor.' },
      ],
    },
    ayuda: {
      titulo: 'Still have questions?',
      texto: 'Message us and we’ll help you set up your first case.',
      whatsapp: 'Message us on WhatsApp',
      mensaje: 'Hi, I have a question about how to use EcoSim.',
    },
    capturas: {
      codigo: 'Screen for typing the account’s access code',
      menu: 'Menu of active cases that students see',
      caso: 'Student view: the ultrasound on the left and the mannequin with its points on the right',
    },
    paso: 'Step',
    consejo: 'Tip',
    volverArriba: 'Back to top',
  },
};
