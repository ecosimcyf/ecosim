// Términos y condiciones y política de privacidad, en los tres idiomas.
//
// Formato de cada documento: secciones { h, bloques }, donde un bloque es
// un texto (párrafo) o { ul: [...] } (lista). Dentro del texto:
// **negrita**, `código` y {correo} (enlace al correo de contacto). Lo
// pinta src/app/landing/TextoLegal.jsx.
//
// La versión que vale es la española: las otras dos lo dicen arriba.

export const LEGAL = {
  es: {
    aviso: null,
    actualizacion: 'Última actualización',
    terminos: {
      metaTitulo: 'Términos y condiciones — EcoSim',
      metaDescripcion: 'Condiciones de uso del servicio EcoSim, simulador de ecografía veterinaria para instituciones educativas y clínicas.',
      titulo: 'Términos y condiciones',
      fecha: '30 de octubre de 2026',
      intro: [
        'Estos términos regulan el uso de EcoSim, un simulador web de ecografía veterinaria dirigido a clínicas e instituciones educativas (en adelante, el “cliente”). El servicio es prestado por Pablo Suaza, persona natural, con domicilio en Colombia (en adelante, “EcoSim”). Al contratar o usar el servicio, el cliente acepta estos términos.',
      ],
      secciones: [
        { h: '1. Qué es el servicio', bloques: [
          'EcoSim es una plataforma web que permite a una institución cargar casos clínicos (videos de ecografía veterinaria asociados a puntos de un maniquí de perro o gato, y, si se desea, exámenes complementarios como laboratorio, radiografías y signos vitales) para que sus estudiantes practiquen la interpretación de ecografías. Los estudiantes acceden mediante un enlace propio de cada cuenta, sin necesidad de crear usuario ni contraseña.',
        ] },
        { h: '2. Contratación', bloques: [
          'Por ahora las cuentas no se crean de forma automática: se habilitan después de que un asesor de EcoSim conversa con el interesado y acuerdan el plan (cupo de casos y de almacenamiento). EcoSim puede ofrecer otras formas de contratación en el futuro, lo que no modifica lo ya acordado con clientes existentes.',
        ] },
        { h: '3. Cuenta y acceso de administrador', bloques: [
          { ul: [
            'El cliente recibe un usuario y contraseña para administrar sus propios casos, videos y los puntos del maniquí de su cuenta.',
            'El cliente es responsable de mantener esas credenciales en secreto y de todo lo que ocurra con su cuenta mientras estén activas.',
            'El enlace que ven los estudiantes (`/c/su-cuenta`) no pide usuario ni contraseña: cualquier persona con el enlace puede practicar los casos activos. El cliente decide a quién se lo comparte.',
          ] },
        ] },
        { h: '4. Contenido que el cliente carga', bloques: [
          'Los videos, imágenes y la información de cada caso son responsabilidad del cliente: debe tener derecho a usarlos y a mostrarlos a sus estudiantes. EcoSim solo los aloja para prestar el servicio y no los usa con otro fin. El cliente puede borrar sus propios casos y videos cuando quiera desde el panel de administración.',
          'EcoSim no se hace responsable por el mal uso que se le dé a ese contenido, ni por material indebido o ilegal que un cliente llegue a subir a la plataforma: esa responsabilidad es siempre de quien lo sube. Por nuestra parte, procuramos mantener la plataforma libre de ese tipo de contenido y, si lo detectamos, podemos eliminarlo y suspender la cuenta responsable (ver sección 9, Terminación).',
        ] },
        { h: '5. Cupos y uso aceptable', bloques: [
          'Cada cuenta tiene un cupo de casos propios y de almacenamiento, acordado al contratar. EcoSim puede avisar y pausar la carga de contenido nuevo si se supera el cupo, sin afectar los casos ya activos. El cliente se compromete a no usar la plataforma para fines distintos a la enseñanza, ni a intentar vulnerar su seguridad.',
        ] },
        { h: '6. Disponibilidad del servicio', bloques: [
          'EcoSim hace un esfuerzo razonable para mantener el servicio disponible, pero no garantiza que esté libre de interrupciones o errores. El servicio se presta “tal cual”, apoyado en infraestructura de terceros (Supabase para base de datos y almacenamiento, Vercel para el alojamiento web).',
        ] },
        { h: '7. Limitación de responsabilidad', bloques: [
          'En la medida que lo permita la ley, EcoSim no responde por daños indirectos, lucro cesante, ni por las consecuencias de que el servicio no esté disponible en un momento puntual — por ejemplo, durante un examen o una clase (ver sección 6, Disponibilidad del servicio). Si llegara a haber responsabilidad económica directa de EcoSim por una falla del servicio o pérdida de información, esta se limita al valor que el cliente haya pagado en los últimos 6 meses. Esta limitación no aplica a daños causados por dolo o culpa grave de EcoSim.',
        ] },
        { h: '8. Propiedad intelectual', bloques: [
          'El software, diseño y funcionamiento de EcoSim son de Pablo Suaza. El contenido que cada cliente carga (sus videos, imágenes y casos) sigue siendo de su propiedad; EcoSim no reclama derechos sobre él.',
        ] },
        { h: '9. Terminación', bloques: [
          'El cliente puede dejar de usar el servicio cuando quiera, incluso borrando su propia cuenta por completo desde el panel de administración (acción permanente, sin reversa). Si una cuenta se cancela, EcoSim puede eliminar su contenido (casos y videos) después de un tiempo razonable de aviso. EcoSim puede suspender una cuenta que incumpla estos términos.',
        ] },
        { h: '10. Cambios a estos términos', bloques: [
          'EcoSim puede actualizar estos términos; los cambios importantes se avisan a los clientes activos por correo. Seguir usando el servicio después de un cambio implica aceptarlo.',
        ] },
        { h: '11. Ley aplicable', bloques: [
          'Estos términos se rigen por las leyes de Colombia.',
        ] },
        { h: '12. Contacto', bloques: [
          'Para cualquier duda sobre estos términos, escribe a {correo}.',
        ] },
      ],
    },
    privacidad: {
      metaTitulo: 'Política de privacidad — EcoSim',
      metaDescripcion: 'Cómo EcoSim recopila, usa y protege los datos personales de quienes visitan el sitio y de las cuentas de clientes.',
      titulo: 'Política de privacidad',
      fecha: '30 de octubre de 2026',
      intro: [
        'Esta política explica qué datos personales recoge EcoSim, para qué los usa y qué derechos tienes sobre ellos, de acuerdo con la normativa de protección de datos vigente en Colombia (Ley 1581 de 2012 y sus decretos reglamentarios).',
      ],
      secciones: [
        { h: '1. Responsable del tratamiento', bloques: [
          'Pablo Suaza, persona natural, domiciliado en Colombia, correo de contacto {correo}.',
        ] },
        { h: '2. Qué datos recogemos', bloques: [
          'Depende de cómo uses EcoSim:',
          { ul: [
            '**Si escribes el formulario de contacto de la página principal:** nombre, clínica o institución, correo, teléfono (opcional) y el mensaje que escribas.',
            '**Si eres administrador de una cuenta cliente:** tu correo y contraseña (guardada de forma cifrada, nunca en texto plano), para darte acceso al panel.',
            '**Si eres estudiante y practicas un caso por el enlace de tu institución:** ningún dato personal. No pedimos usuario ni guardamos ningún identificador tuyo. Lo único que puede quedar en tu navegador es el idioma que elijas, si lo cambias (ver sección 5).',
          ] },
        ] },
        { h: '3. Para qué usamos tus datos y por cuánto tiempo', bloques: [
          { ul: [
            'Responder a tu solicitud de contacto y, si se concreta, gestionar la cuenta de tu institución.',
            'Darte acceso al panel de administración si eres cliente.',
            'Dar soporte cuando lo necesites.',
          ] },
          'No vendemos ni compartimos tus datos con terceros para fines publicitarios.',
          'El formulario de contacto solo se envía si marcas la casilla de autorización; guardamos la fecha en que lo hiciste. Conservamos los datos de una solicitud mientras haya una conversación comercial abierta y, como máximo, dos años después del último contacto; los de una cuenta cliente, mientras la cuenta exista. Si borras tu cuenta desde el panel, tus datos de acceso se eliminan de inmediato.',
        ] },
        { h: '4. Con quién se comparten', bloques: [
          'Los datos se alojan en la infraestructura de nuestros proveedores de tecnología, que actúan como encargados del tratamiento (no usan tus datos para fines propios):',
          { ul: [
            '**Supabase** — base de datos, autenticación y almacenamiento de archivos.',
            '**Vercel** — alojamiento del sitio web.',
          ] },
          'Los servidores de estos proveedores pueden estar fuera de Colombia (por ejemplo, en Estados Unidos). Al autorizar el tratamiento de tus datos aceptas también esa transferencia internacional, que se hace solo con proveedores que ofrecen niveles adecuados de protección de datos.',
        ] },
        { h: '5. Cookies', bloques: [
          'Ninguna parte del sitio usa cookies para rastrearte ni con fines publicitarios.',
          'Si eliges un idioma con el selector de idioma, guardamos esa preferencia en una cookie (llamada «idioma») durante un año, para mostrarte el sitio en ese idioma la próxima vez. Solo contiene el idioma elegido (por ejemplo, «pt»), ningún dato tuyo. Si nunca cambias el idioma, no se guarda.',
          'El panel de administración usa además una cookie técnica, estrictamente necesaria para mantener la sesión iniciada — sin ella no podrías permanecer conectado.',
          'Usamos también Vercel Analytics y Speed Insights para entender el uso general del sitio (qué páginas se visitan, tiempos de carga). Según la documentación de Vercel, estas herramientas no usan cookies y los datos que recogen son anónimos: no identifican a ninguna persona ni permiten reconstruir su navegación.',
        ] },
        { h: '6. Tus derechos', bloques: [
          'Si tus datos están en nuestras bases (por ejemplo, porque escribiste el formulario de contacto o administras una cuenta), puedes en cualquier momento:',
          { ul: [
            'Conocer qué datos tuyos tenemos.',
            'Pedir que los actualicemos o corrijamos.',
            'Pedir que los eliminemos.',
            'Revocar la autorización para seguir tratándolos.',
          ] },
          'Para ejercer cualquiera de estos derechos, escribe a {correo}. Responderemos en los plazos que establece la ley.',
        ] },
        { h: '7. Seguridad', bloques: [
          'Protegemos tus datos con medidas razonables: las contraseñas se guardan cifradas, el acceso de administrador requiere inicio de sesión, y las escrituras a la base de datos solo las hace nuestro servidor, nunca el navegador directamente.',
        ] },
        { h: '8. Cambios a esta política', bloques: [
          'Si hacemos cambios importantes a esta política, lo avisaremos a los clientes activos por correo.',
        ] },
      ],
    },
  },

  pt: {
    aviso: 'Esta tradução é oferecida para sua conveniência. Em caso de divergência, prevalece a versão em espanhol.',
    actualizacion: 'Última atualização',
    terminos: {
      metaTitulo: 'Termos e condições — EcoSim',
      metaDescripcion: 'Condições de uso do serviço EcoSim, simulador de ultrassonografia veterinária para instituições de ensino e clínicas.',
      titulo: 'Termos e condições',
      fecha: '30 de outubro de 2026',
      intro: [
        'Estes termos regulam o uso do EcoSim, um simulador web de ultrassonografia veterinária voltado a clínicas e instituições de ensino (doravante, o “cliente”). O serviço é prestado por Pablo Suaza, pessoa física, domiciliado na Colômbia (doravante, “EcoSim”). Ao contratar ou usar o serviço, o cliente aceita estes termos.',
      ],
      secciones: [
        { h: '1. O que é o serviço', bloques: [
          'O EcoSim é uma plataforma web que permite a uma instituição cadastrar casos clínicos (vídeos de ultrassonografia veterinária associados a pontos de um manequim de cão ou gato e, se desejado, exames complementares como laboratório, radiografias e sinais vitais) para que seus alunos pratiquem a interpretação de ultrassonografias. Os alunos acessam por meio de um link próprio de cada conta, sem precisar criar usuário nem senha.',
        ] },
        { h: '2. Contratação', bloques: [
          'Por enquanto as contas não são criadas automaticamente: são habilitadas depois que um consultor do EcoSim conversa com o interessado e ambos definem o plano (limite de casos e de armazenamento). O EcoSim poderá oferecer outras formas de contratação no futuro, o que não altera o que já foi acordado com clientes existentes.',
        ] },
        { h: '3. Conta e acesso de administrador', bloques: [
          { ul: [
            'O cliente recebe um usuário e uma senha para administrar seus próprios casos, vídeos e os pontos do manequim da sua conta.',
            'O cliente é responsável por manter essas credenciais em sigilo e por tudo o que ocorrer com a sua conta enquanto estiverem ativas.',
            'O link que os alunos acessam (`/c/sua-conta`) não pede usuário nem senha: qualquer pessoa com o link pode praticar os casos ativos. O cliente decide com quem o compartilha.',
          ] },
        ] },
        { h: '4. Conteúdo enviado pelo cliente', bloques: [
          'Os vídeos, as imagens e as informações de cada caso são de responsabilidade do cliente, que deve ter o direito de usá-los e de exibi-los aos seus alunos. O EcoSim apenas os hospeda para prestar o serviço e não os usa para nenhuma outra finalidade. O cliente pode excluir seus próprios casos e vídeos quando quiser pelo painel de administração.',
          'O EcoSim não se responsabiliza pelo mau uso desse conteúdo nem por material impróprio ou ilegal que um cliente venha a enviar à plataforma: essa responsabilidade é sempre de quem o envia. De nossa parte, procuramos manter a plataforma livre desse tipo de conteúdo e, se o identificarmos, podemos removê-lo e suspender a conta responsável (ver seção 9, Rescisão).',
        ] },
        { h: '5. Limites e uso aceitável', bloques: [
          'Cada conta tem um limite de casos próprios e de armazenamento, definido na contratação. O EcoSim pode avisar e pausar o envio de novos conteúdos se o limite for ultrapassado, sem afetar os casos já ativos. O cliente se compromete a não usar a plataforma para fins diferentes do ensino nem a tentar violar a sua segurança.',
        ] },
        { h: '6. Disponibilidade do serviço', bloques: [
          'O EcoSim faz um esforço razoável para manter o serviço disponível, mas não garante que ele esteja livre de interrupções ou erros. O serviço é prestado “no estado em que se encontra”, com base em infraestrutura de terceiros (Supabase para banco de dados e armazenamento, Vercel para a hospedagem web).',
        ] },
        { h: '7. Limitação de responsabilidade', bloques: [
          'Na medida permitida pela lei, o EcoSim não responde por danos indiretos, lucros cessantes nem pelas consequências de o serviço ficar indisponível em um momento específico — por exemplo, durante uma prova ou uma aula (ver seção 6, Disponibilidade do serviço). Caso haja responsabilidade financeira direta do EcoSim por uma falha do serviço ou perda de informações, ela se limita ao valor pago pelo cliente nos últimos 6 meses. Esta limitação não se aplica a danos causados por dolo ou culpa grave do EcoSim.',
        ] },
        { h: '8. Propriedade intelectual', bloques: [
          'O software, o design e o funcionamento do EcoSim pertencem a Pablo Suaza. O conteúdo que cada cliente envia (seus vídeos, imagens e casos) continua sendo de sua propriedade; o EcoSim não reivindica direitos sobre ele.',
        ] },
        { h: '9. Rescisão', bloques: [
          'O cliente pode deixar de usar o serviço quando quiser, inclusive excluindo completamente a sua própria conta pelo painel de administração (ação permanente e irreversível). Se uma conta for cancelada, o EcoSim poderá excluir o seu conteúdo (casos e vídeos) após um prazo razoável de aviso. O EcoSim pode suspender uma conta que descumpra estes termos.',
        ] },
        { h: '10. Alterações destes termos', bloques: [
          'O EcoSim pode atualizar estes termos; as alterações importantes serão comunicadas por e-mail aos clientes ativos. Continuar usando o serviço após uma alteração implica aceitá-la.',
        ] },
        { h: '11. Lei aplicável', bloques: [
          'Estes termos são regidos pelas leis da Colômbia.',
        ] },
        { h: '12. Contato', bloques: [
          'Para qualquer dúvida sobre estes termos, escreva para {correo}.',
        ] },
      ],
    },
    privacidad: {
      metaTitulo: 'Política de privacidade — EcoSim',
      metaDescripcion: 'Como o EcoSim coleta, usa e protege os dados pessoais de quem visita o site e das contas de clientes.',
      titulo: 'Política de privacidade',
      fecha: '30 de outubro de 2026',
      intro: [
        'Esta política explica quais dados pessoais o EcoSim coleta, para que os usa e quais direitos você tem sobre eles, de acordo com a legislação de proteção de dados vigente na Colômbia (Lei 1581 de 2012 e seus decretos regulamentares).',
      ],
      secciones: [
        { h: '1. Controlador dos dados', bloques: [
          'Pablo Suaza, pessoa física, domiciliado na Colômbia, e-mail de contato {correo}.',
        ] },
        { h: '2. Quais dados coletamos', bloques: [
          'Depende de como você usa o EcoSim:',
          { ul: [
            '**Se você preenche o formulário de contato da página principal:** nome, clínica ou instituição, e-mail, telefone (opcional) e a mensagem que escrever.',
            '**Se você é administrador de uma conta cliente:** seu e-mail e sua senha (armazenada de forma criptografada, nunca em texto puro), para dar acesso ao painel.',
            '**Se você é aluno e pratica um caso pelo link da sua instituição:** nenhum dado pessoal. Não pedimos usuário nem armazenamos nenhum identificador seu. A única coisa que pode ficar no seu navegador é o idioma que você escolher, se o mudar (ver seção 5).',
          ] },
        ] },
        { h: '3. Para que usamos seus dados e por quanto tempo', bloques: [
          { ul: [
            'Responder à sua solicitação de contato e, se ela se concretizar, gerenciar a conta da sua instituição.',
            'Dar acesso ao painel de administração, se você for cliente.',
            'Oferecer suporte quando você precisar.',
          ] },
          'Não vendemos nem compartilhamos seus dados com terceiros para fins publicitários.',
          'O formulário de contato só é enviado se você marcar a caixa de autorização; registramos a data em que o fez. Mantemos os dados de uma solicitação enquanto houver uma conversa comercial em andamento e, no máximo, por dois anos após o último contato; os de uma conta cliente, enquanto a conta existir. Se você excluir a sua conta pelo painel, seus dados de acesso são apagados imediatamente.',
        ] },
        { h: '4. Com quem são compartilhados', bloques: [
          'Os dados ficam hospedados na infraestrutura dos nossos fornecedores de tecnologia, que atuam como operadores (não usam seus dados para fins próprios):',
          { ul: [
            '**Supabase** — banco de dados, autenticação e armazenamento de arquivos.',
            '**Vercel** — hospedagem do site.',
          ] },
          'Os servidores desses fornecedores podem estar fora da Colômbia (por exemplo, nos Estados Unidos). Ao autorizar o tratamento dos seus dados, você também aceita essa transferência internacional, que é feita apenas com fornecedores que oferecem níveis adequados de proteção de dados.',
        ] },
        { h: '5. Cookies', bloques: [
          'Nenhuma parte do site usa cookies para rastrear você nem para fins publicitários.',
          'Se você escolher um idioma no seletor de idioma, guardamos essa preferência em um cookie (chamado «idioma») por um ano, para mostrar o site nesse idioma da próxima vez. Ele contém apenas o idioma escolhido (por exemplo, «pt»), nenhum dado seu. Se você nunca mudar o idioma, nada é guardado.',
          'O painel de administração usa, além disso, um cookie técnico, estritamente necessário para manter a sessão iniciada — sem ele você não conseguiria permanecer conectado.',
          'Também usamos o Vercel Analytics e o Speed Insights para entender o uso geral do site (quais páginas são visitadas, tempos de carregamento). Segundo a documentação da Vercel, essas ferramentas não usam cookies e os dados que coletam são anônimos: não identificam nenhuma pessoa nem permitem reconstruir a sua navegação.',
        ] },
        { h: '6. Seus direitos', bloques: [
          'Se os seus dados estão em nossas bases (por exemplo, porque você preencheu o formulário de contato ou administra uma conta), você pode, a qualquer momento:',
          { ul: [
            'Saber quais dados seus temos.',
            'Pedir que os atualizemos ou corrijamos.',
            'Pedir que os excluamos.',
            'Revogar a autorização para continuarmos a tratá-los.',
          ] },
          'Para exercer qualquer um desses direitos, escreva para {correo}. Responderemos nos prazos estabelecidos pela lei.',
        ] },
        { h: '7. Segurança', bloques: [
          'Protegemos seus dados com medidas razoáveis: as senhas são armazenadas de forma criptografada, o acesso de administrador exige login, e as gravações no banco de dados são feitas somente pelo nosso servidor, nunca diretamente pelo navegador.',
        ] },
        { h: '8. Alterações desta política', bloques: [
          'Se fizermos alterações importantes nesta política, avisaremos os clientes ativos por e-mail.',
        ] },
      ],
    },
  },

  en: {
    aviso: 'This translation is provided for your convenience. In the event of any discrepancy, the Spanish version prevails.',
    actualizacion: 'Last updated',
    terminos: {
      metaTitulo: 'Terms and conditions — EcoSim',
      metaDescripcion: 'Terms of use of EcoSim, a veterinary ultrasound simulator for educational institutions and clinics.',
      titulo: 'Terms and conditions',
      fecha: 'October 30, 2026',
      intro: [
        'These terms govern the use of EcoSim, a web-based veterinary ultrasound simulator for clinics and educational institutions (hereinafter, the “client”). The service is provided by Pablo Suaza, an individual domiciled in Colombia (hereinafter, “EcoSim”). By contracting or using the service, the client accepts these terms.',
      ],
      secciones: [
        { h: '1. What the service is', bloques: [
          'EcoSim is a web platform that allows an institution to upload clinical cases (veterinary ultrasound videos linked to points on a dog or cat mannequin and, if desired, ancillary tests such as lab work, radiographs, and vital signs) so that its students can practice interpreting ultrasound. Students access it through each account’s own link, without having to create a username or password.',
        ] },
        { h: '2. Contracting', bloques: [
          'For now, accounts are not created automatically: they are set up after an EcoSim advisor talks with the interested party and they agree on a plan (case and storage limits). EcoSim may offer other ways to contract the service in the future, which does not change what has already been agreed with existing clients.',
        ] },
        { h: '3. Account and administrator access', bloques: [
          { ul: [
            'The client receives a username and password to manage their own cases, videos, and the mannequin points of their account.',
            'The client is responsible for keeping those credentials secret and for everything that happens with their account while they are active.',
            'The link that students use (`/c/your-account`) does not ask for a username or password: anyone with the link can practice the active cases. The client decides who to share it with.',
          ] },
        ] },
        { h: '4. Content uploaded by the client', bloques: [
          'The videos, images, and information in each case are the client’s responsibility: the client must have the right to use them and to show them to their students. EcoSim only hosts them in order to provide the service and does not use them for any other purpose. The client can delete their own cases and videos at any time from the administration dashboard.',
          'EcoSim is not responsible for any misuse of that content, or for any inappropriate or illegal material a client may upload to the platform: that responsibility always lies with whoever uploads it. For our part, we try to keep the platform free of such content and, if we detect it, we may remove it and suspend the responsible account (see section 9, Termination).',
        ] },
        { h: '5. Limits and acceptable use', bloques: [
          'Each account has a limit on its own cases and on storage, agreed upon when contracting. EcoSim may notify the client and pause the upload of new content if the limit is exceeded, without affecting cases that are already active. The client agrees not to use the platform for purposes other than teaching, and not to attempt to breach its security.',
        ] },
        { h: '6. Service availability', bloques: [
          'EcoSim makes reasonable efforts to keep the service available, but does not guarantee that it will be free of interruptions or errors. The service is provided “as is”, relying on third-party infrastructure (Supabase for the database and storage, Vercel for web hosting).',
        ] },
        { h: '7. Limitation of liability', bloques: [
          'To the extent permitted by law, EcoSim is not liable for indirect damages, loss of profits, or the consequences of the service being unavailable at a given moment — for example, during an exam or a class (see section 6, Service availability). Should EcoSim bear any direct financial liability for a service failure or loss of information, it is limited to the amount the client has paid in the last 6 months. This limitation does not apply to damages caused by EcoSim’s willful misconduct or gross negligence.',
        ] },
        { h: '8. Intellectual property', bloques: [
          'EcoSim’s software, design, and functionality belong to Pablo Suaza. The content each client uploads (their videos, images, and cases) remains their property; EcoSim claims no rights over it.',
        ] },
        { h: '9. Termination', bloques: [
          'The client may stop using the service at any time, including by permanently deleting their own account from the administration dashboard (a permanent, irreversible action). If an account is cancelled, EcoSim may delete its content (cases and videos) after reasonable notice. EcoSim may suspend an account that breaches these terms.',
        ] },
        { h: '10. Changes to these terms', bloques: [
          'EcoSim may update these terms; important changes will be communicated to active clients by email. Continuing to use the service after a change constitutes acceptance of it.',
        ] },
        { h: '11. Governing law', bloques: [
          'These terms are governed by the laws of Colombia.',
        ] },
        { h: '12. Contact', bloques: [
          'If you have any questions about these terms, write to {correo}.',
        ] },
      ],
    },
    privacidad: {
      metaTitulo: 'Privacy policy — EcoSim',
      metaDescripcion: 'How EcoSim collects, uses, and protects the personal data of site visitors and client accounts.',
      titulo: 'Privacy policy',
      fecha: 'October 30, 2026',
      intro: [
        'This policy explains what personal data EcoSim collects, what it is used for, and what rights you have over it, in accordance with the data protection regulations in force in Colombia (Law 1581 of 2012 and its implementing decrees).',
      ],
      secciones: [
        { h: '1. Data controller', bloques: [
          'Pablo Suaza, an individual domiciled in Colombia, contact email {correo}.',
        ] },
        { h: '2. What data we collect', bloques: [
          'It depends on how you use EcoSim:',
          { ul: [
            '**If you fill in the contact form on the home page:** your name, clinic or institution, email, phone number (optional), and the message you write.',
            '**If you are the administrator of a client account:** your email and password (stored encrypted, never in plain text), to give you access to the dashboard.',
            '**If you are a student practicing a case through your institution’s link:** no personal data. We don’t ask for a username or store any identifier of yours. The only thing that may be saved in your browser is the language you choose, if you change it (see section 5).',
          ] },
        ] },
        { h: '3. What we use your data for and for how long', bloques: [
          { ul: [
            'To respond to your contact request and, if it goes ahead, to manage your institution’s account.',
            'To give you access to the administration dashboard if you are a client.',
            'To provide support when you need it.',
          ] },
          'We do not sell your data or share it with third parties for advertising purposes.',
          'The contact form is only sent if you tick the authorization box; we record the date you did so. We keep the data from a request while a business conversation is ongoing and for no more than two years after the last contact; the data of a client account, for as long as the account exists. If you delete your account from the dashboard, your access data is deleted immediately.',
        ] },
        { h: '4. Who it is shared with', bloques: [
          'The data is hosted on the infrastructure of our technology providers, who act as data processors (they do not use your data for their own purposes):',
          { ul: [
            '**Supabase** — database, authentication, and file storage.',
            '**Vercel** — website hosting.',
          ] },
          'These providers’ servers may be located outside Colombia (for example, in the United States). By authorizing the processing of your data, you also accept this international transfer, which is made only to providers that offer adequate levels of data protection.',
        ] },
        { h: '5. Cookies', bloques: [
          'No part of the site uses cookies to track you or for advertising purposes.',
          'If you choose a language with the language selector, we save that preference in a cookie (named “idioma”) for one year, so the site is shown in that language next time. It only contains the chosen language (for example, “en”), no data about you. If you never change the language, nothing is saved.',
          'The administration dashboard also uses a technical cookie that is strictly necessary to keep you signed in — without it, you could not stay logged in.',
          'We also use Vercel Analytics and Speed Insights to understand general use of the site (which pages are visited, loading times). According to Vercel’s documentation, these tools do not use cookies and the data they collect is anonymous: it does not identify anyone or allow their browsing to be reconstructed.',
        ] },
        { h: '6. Your rights', bloques: [
          'If your data is in our databases (for example, because you filled in the contact form or manage an account), you may at any time:',
          { ul: [
            'Find out what data of yours we hold.',
            'Ask us to update or correct it.',
            'Ask us to delete it.',
            'Withdraw your authorization for us to keep processing it.',
          ] },
          'To exercise any of these rights, write to {correo}. We will respond within the time limits set by law.',
        ] },
        { h: '7. Security', bloques: [
          'We protect your data with reasonable measures: passwords are stored encrypted, administrator access requires signing in, and writes to the database are made only by our server, never directly by the browser.',
        ] },
        { h: '8. Changes to this policy', bloques: [
          'If we make important changes to this policy, we will notify active clients by email.',
        ] },
      ],
    },
  },
};
